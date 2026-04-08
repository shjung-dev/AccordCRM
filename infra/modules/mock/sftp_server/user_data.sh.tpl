#!/bin/bash
set -e

# Create SFTP-only user
useradd -m -s /bin/false sftpuser

# Set up SSH authorized keys
mkdir -p /home/sftpuser/.ssh
cat > /home/sftpuser/.ssh/authorized_keys << 'PUBKEY_EOF'
${sftp_user_public_key}
PUBKEY_EOF
chmod 700 /home/sftpuser/.ssh
chmod 600 /home/sftpuser/.ssh/authorized_keys
chown -R sftpuser:sftpuser /home/sftpuser/.ssh

# Create incoming directory with sample transaction CSV file
mkdir -p /home/sftpuser/incoming

cat > /home/sftpuser/incoming/transactions.csv << 'DATA_EOF'
transaction_id,client_id,account_id,transaction_type,currency,amount,status,description,failure_reason,created_at
a1b2c3d4-0001-0001-0001-000000000001,00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000011,D,SGD,1000.00,Completed,Salary deposit,,2026-04-01T08:00:00Z
a1b2c3d4-0001-0001-0001-000000000002,00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000011,W,SGD,250.50,Completed,Groceries,,2026-04-01T10:30:00Z
a1b2c3d4-0001-0001-0001-000000000003,00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000011,W,SGD,800.00,Pending,Monthly rent payment,,2026-04-02T09:00:00Z
a1b2c3d4-0001-0001-0001-000000000004,00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000012,D,SGD,5000.00,Completed,Bonus payout,,2026-04-02T12:00:00Z
a1b2c3d4-0001-0001-0001-000000000005,00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000012,W,USD,200.00,Failed,Overseas transfer,Insufficient funds,2026-04-02T14:00:00Z
a1b2c3d4-0001-0001-0001-000000000006,00000000-0000-0000-0000-000000000002,00000000-0000-0000-0000-000000000021,D,SGD,3000.00,Completed,Transfer in,,2026-04-03T08:00:00Z
a1b2c3d4-0001-0001-0001-000000000007,00000000-0000-0000-0000-000000000002,00000000-0000-0000-0000-000000000021,W,SGD,150.00,Completed,Utilities,,2026-04-03T09:00:00Z
a1b2c3d4-0001-0001-0001-000000000008,00000000-0000-0000-0000-000000000002,00000000-0000-0000-0000-000000000021,W,SGD,9999.99,Failed,Wire transfer,Account suspended,2026-04-03T11:00:00Z
a1b2c3d4-0001-0001-0001-000000000009,00000000-0000-0000-0000-000000000002,00000000-0000-0000-0000-000000000022,D,SGD,500.00,Pending,Insurance refund,,2026-04-03T15:00:00Z
,00000000-0000-0000-0000-000000000002,00000000-0000-0000-0000-000000000022,D,SGD,100.00,Completed,ATM deposit,,
DATA_EOF

chown -R sftpuser:sftpuser /home/sftpuser/incoming

# Install pre-generated RSA host key so the trusted_host_key is known to Terraform
cat > /etc/ssh/ssh_host_rsa_key << 'HOSTKEY_EOF'
${ssh_host_private_key}
HOSTKEY_EOF
chmod 600 /etc/ssh/ssh_host_rsa_key
ssh-keygen -y -f /etc/ssh/ssh_host_rsa_key > /etc/ssh/ssh_host_rsa_key.pub
chmod 644 /etc/ssh/ssh_host_rsa_key.pub

# Configure sshd: restrict sftpuser to SFTP only
cat >> /etc/ssh/sshd_config << 'SSHD_EOF'

Match User sftpuser
    ForceCommand internal-sftp
    PasswordAuthentication no
    ChrootDirectory /home/sftpuser
    PermitTunnel no
    AllowAgentForwarding no
    AllowTcpForwarding no
    X11Forwarding no
SSHD_EOF

# Fix ChrootDirectory ownership (must be owned by root)
chown root:root /home/sftpuser
chmod 755 /home/sftpuser

# Move files inside chroot (incoming dir is inside /home/sftpuser already)
systemctl restart sshd
