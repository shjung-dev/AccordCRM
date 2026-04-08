# =============================================================
# seed_users.tf
# Creates Cognito accounts for the seeded DB users (V3__seed.sql).
#
# To disable: set enable_seed_users = false in the module call.
# To remove entirely: delete this file and run terraform apply.
# =============================================================

locals {
  seed_users = var.enable_seed_users ? {
    # Default evaluation accounts (V4__default_accounts.sql)
    "admin-crm"   = { email = "admin@crm.com",            given_name = "Admin",   family_name = "User", group = "admin" }
    "agent1-crm"  = { email = "agent1@crm.com",           given_name = "Agent",   family_name = "One",  group = "agent" }
    # Seeded demo accounts (V3__seed.sql)
    "diana.lim"  = { email = "diana.lim@accordcrm.com",  given_name = "Diana",   family_name = "Lim",  group = "admin" }
    "ethan.ng"   = { email = "ethan.ng@accordcrm.com",   given_name = "Ethan",   family_name = "Ng",   group = "admin" }
    "alice.wong" = { email = "alice.wong@accordcrm.com", given_name = "Alice",   family_name = "Wong", group = "agent" }
    "bob.tan"    = { email = "bob.tan@accordcrm.com",    given_name = "Bob",     family_name = "Tan",  group = "agent" }
    "charlie.lee"= { email = "charlie.lee@accordcrm.com",given_name = "Charlie", family_name = "Lee",  group = "agent" }
  } : {}
}

resource "aws_cognito_user" "seed" {
  for_each = local.seed_users

  user_pool_id       = aws_cognito_user_pool.main.id
  username           = each.value.email
  temporary_password = var.seed_user_temp_password

  attributes = {
    email          = each.value.email
    email_verified = "true"
    given_name     = each.value.given_name
    family_name    = each.value.family_name
  }

  lifecycle {
    ignore_changes = [temporary_password]
  }
}

resource "aws_cognito_user_in_group" "seed" {
  for_each = local.seed_users

  user_pool_id = aws_cognito_user_pool.main.id
  username     = aws_cognito_user.seed[each.key].username
  group_name   = each.value.group
}
