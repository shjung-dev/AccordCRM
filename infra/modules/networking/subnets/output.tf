output "public_subnet_ids"{
    value = [aws_subnet.public_a.id , aws_subnet.public_b.id]
}

output "private_app_subnet_ids"{
    value = [aws_subnet.app_layer_a.id , aws_subnet.app_layer_b.id]
}

output "private_data_subnet_ids"{
    value = [aws_subnet.data_layer_a.id , aws_subnet.data_layer_b.id]
}

output "private_lambda_subnet_ids" {
  value = [aws_subnet.lambda_layer_a.id, aws_subnet.lambda_layer_b.id]
}




