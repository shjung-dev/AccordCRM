#ALB
resource "aws_lb" "alb" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name        = "${var.project_name}-alb"
    Environment = var.environment
  }
}


#Create Target Group (One for each Microservice)
resource "aws_lb_target_group" "target_group" {
  for_each = var.microservices

  name        = "${substr(replace(var.project_name, "_", "-"), 0, 12)}-${substr(replace(each.key, "_", "-"), 0, 12)}-tg"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = each.value.health_check_path
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }

  tags = {
    Name        = "${var.project_name}-${each.key}-tg"
    Environment = var.environment
    Service     = each.key
  }
}


#ALB listens for HTTP requests — default blocks direct access (no CloudFront secret header)
resource "aws_lb_listener" "http_listener" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}



#Listener Rules — forward only when path matches AND CloudFront secret header is present
resource "aws_lb_listener_rule" "listener_rule" {
  for_each     = var.microservices
  listener_arn = aws_lb_listener.http_listener.arn
  priority     = each.value.priority
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.target_group[each.key].arn
  }
  condition {
    path_pattern {
      values = each.value.path_patterns
    }
  }
  condition {
    http_header {
      http_header_name = "X-CloudFront-Secret"
      values           = [var.cloudfront_secret]
    }
  }
}

















