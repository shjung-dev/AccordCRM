# Origin Access Control (OAC)
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.frontend_bucket_name}-oac"
  description                       = "OAC for frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}


#SPA routing
resource "aws_cloudfront_function" "rewrite" {
  name    = "spa-${var.environment}-uri-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true

  code = <<-JSFUNCTION
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Pass API routes straight to ECS
      if (uri.startsWith('/api/')) {
        return request;
      }

      // Pass static files as-is (.js, .css, .png, etc.)
      if (uri.match(/\.[a-zA-Z0-9]+$/)) {
        return request;
      }

      // Rewrite UUID segments to _ (the static shell placeholder)
      // e.g. /admin/agents/550e8400-e29b-41d4-a716-446655440000 → /admin/agents/_
      var uuidRegex = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      uri = uri.replace(uuidRegex, '/_');

      // Append index.html for SPA routing
      if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
      } else {
        request.uri = uri + '/index.html';
      }

      return request;
    }
  JSFUNCTION
}

##########################
# Response Headers Policy
##########################
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "spa-${var.environment}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options { override = true }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self' https://www.itsag2t2.com; script-src 'self' https://www.itsag2t2.com 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' https://www.itsag2t2.com 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://www.itsag2t2.com https://fonts.gstatic.com; img-src 'self' https://www.itsag2t2.com data: https://images.unsplash.com https://maps.googleapis.com https://maps.gstatic.com; connect-src 'self' https://www.itsag2t2.com https://maps.googleapis.com; frame-src 'none';"
      override                = true
    }
  }
}

##########################
# CloudFront Distribution
##########################
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Frontend (${var.environment})"
  default_root_object = "index.html"
  price_class         = var.price_class
  http_version        = "http2and3"

  # Root + www aliases
  aliases = [var.root_domain_name, var.subdomain_name]

  web_acl_id = var.waf_web_acl_arn

  # S3 Origin (static assets)
  origin {
    domain_name              = var.s3_frontend_bucket_domain
    origin_id                = "s3-${var.frontend_bucket_id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  # ALB Origin (Next.js server — handles /api/* routes)
  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-frontend"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    custom_header {
      name  = "X-CloudFront-Secret"
      value = var.cloudfront_secret
    }
  }

  # /api/* → ALB (Next.js API routes — no caching, forward everything)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "alb-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Default Cache Behavior
  default_cache_behavior {
    target_origin_id       = "s3-${var.frontend_bucket_id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 300
    max_ttl     = 1800

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # SPA Fallback for 403/404
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  viewer_certificate {
    acm_certificate_arn = var.acm_certificate_arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  tags = {
    Name = "spa-${var.environment}"
  }
}