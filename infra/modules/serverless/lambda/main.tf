#Lambda function
resource "aws_lambda_function" "lambda" {
  for_each      = var.lambdas
  function_name = "${var.project_name}-${each.key}-lambda"

  role = var.lambda_role_arns[each.key] # Get the corresponding IAM role ARN for the lambda function

  # e.g -> com.example.TransactionHandler::handleRequest
  #Need to Follow the backend lambda codes information
  #com.example.TransactionHandler -> package and class name
  #handleRequest -> function name
  handler = each.value.handler


  runtime     = each.value.runtime #Java version (11 or 17)
  memory_size = each.value.memory_size
  timeout     = each.value.timeout
  filename         = each.value.jar_path
  source_code_hash = filebase64sha256(each.value.jar_path)
  publish          = true

  environment {
    variables = each.value.env_vars
  }

  dynamic "vpc_config" {
    for_each = each.value.vpc_config != null ? [each.value.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  tags = {
    Project = var.project_name
    Env     = var.environment
    Service = each.key
  }
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  for_each = {
    for name, cfg in var.sqs_event_source_mappings :
    name => cfg
    if cfg.enabled && contains(keys(var.lambdas), cfg.lambda_key)
  }

  event_source_arn                   = each.value.event_source_arn
  function_name                      = aws_lambda_function.lambda[each.value.lambda_key].arn
  enabled                            = each.value.enabled
  batch_size                         = each.value.batch_size
  maximum_batching_window_in_seconds = each.value.maximum_batching_window_in_seconds
}






