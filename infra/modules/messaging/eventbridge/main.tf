#EventBridge rule (schedular)
resource "aws_cloudwatch_event_rule" "eventbridge_rule" {
  for_each            = { for k, v in var.lambdas : k => v if v.schedule_expression != "" } # Filter lambdas that have a schedule expression defined
  name                = "${var.project_name}-${each.key}-schedule-rule"
  schedule_expression = each.value.schedule_expression
}



#EventBridge target (Lambda function)
resource "aws_cloudwatch_event_target" "lambda_target" {
  for_each  = { for k, v in var.lambdas : k => v if v.schedule_expression != "" } # Filter lambdas that have a schedule expression defined
  rule      = aws_cloudwatch_event_rule.eventbridge_rule[each.key].name
  arn       = each.value.lambda_arn
  target_id = "${var.project_name}-${each.key}-lambda-target"
}



#Permission for EventBridge to invoke Lambda function
resource "aws_lambda_permission" "allow_eventbridge_invoke" {
  for_each      = { for k, v in var.lambdas : k => v if v.schedule_expression != "" } # Filter lambdas that have a schedule expression defined
  statement_id  = "${var.project_name}-${each.key}-eventbridge-invoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value.lambda_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.eventbridge_rule[each.key].arn
}
















