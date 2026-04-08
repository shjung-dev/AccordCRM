#Public route table for public subnets
resource "aws_route_table" "public_rt" {
  vpc_id = var.vpc_id
  tags = {
    Name = "${var.project_name}-public-rt"
  }
}


resource "aws_route" "enforce_all_traffic_to_igw_for_public_rt" {
  route_table_id         = aws_route_table.public_rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = var.igw_id
}

resource "aws_route_table_association" "public_rt_association" {
  count          = length(var.public_subnet_ids)
  subnet_id      = var.public_subnet_ids[count.index]
  route_table_id = aws_route_table.public_rt.id
}



#Private route table for private_app_subnets
resource "aws_route_table" "private_app_rt" {
  vpc_id = var.vpc_id
  tags = {
    Name = "${var.project_name}-private-app-rt"
  }
}

resource "aws_route_table_association" "private_app_rt_association" {
  count          = length(var.private_app_subnet_ids)
  subnet_id      = var.private_app_subnet_ids[count.index]
  route_table_id = aws_route_table.private_app_rt.id
}




#Private route table for private_lambda_subnets
resource "aws_route_table" "private_lambda_rt" {
  vpc_id = var.vpc_id
  tags = {
    Name = "${var.project_name}-private-lambda-rt"
  }
}

resource "aws_route_table_association" "private_lambda_rt_association" {
  count          = length(var.private_lambda_subnet_ids)
  subnet_id      = var.private_lambda_subnet_ids[count.index]
  route_table_id = aws_route_table.private_lambda_rt.id
}



#Private route table for private_data_subnets
resource "aws_route_table" "private_data_rt" {
  vpc_id = var.vpc_id
  tags = {
    Name = "${var.project_name}-private-data-rt"
  }
}

resource "aws_route_table_association" "private_data_rt_association" {
  count          = length(var.private_data_subnet_ids)
  subnet_id      = var.private_data_subnet_ids[count.index]
  route_table_id = aws_route_table.private_data_rt.id
}



