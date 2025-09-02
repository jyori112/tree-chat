# Tree Chat AWS EC2 Deployment with Terraform

このディレクトリには、Tree ChatアプリケーションをAWS EC2にデプロイするためのTerraform設定が含まれています。

## 🚀 クイックスタート

```bash
# 1. デプロイスクリプトを実行
cd tree-chat
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 2. APIキーを設定
# terraform/terraform.tfvars を編集して必要なAPIキーを追加

# 3. デプロイ完了を待つ
```

## 📋 前提条件

- AWS CLIがインストール・設定済み
- Terraformがインストール済み (v1.0以上)
- 以下のAPIキーを取得済み:
  - Anthropic API Key (必須)
  - OpenAI API Key (オプション)

## 🏗️ インフラストラクチャ構成

### リソース
- **EC2インスタンス**: t3.small (推奨) または t3.micro (無料枠)
- **VPC**: 専用VPCとパブリックサブネット
- **Elastic IP**: 固定IPアドレス
- **Security Group**: 必要なポートのみ開放
- **EBS**: 20GB gp3ボリューム

### ポート設定
- 22: SSH
- 80: HTTP
- 443: HTTPS
- 3000: Next.js (開発用)
- 2024: LangGraph API

## 💰 コスト見積もり

### t3.micro (無料枠対象)
- **EC2**: $0/月 (750時間/月まで無料)
- **EBS**: $1.60/月 (20GB)
- **Elastic IP**: $0/月 (インスタンス稼働中)
- **合計**: 約$1.60/月

### t3.small (推奨)
- **EC2**: $19.58/月 (24時間×30日)
- **EBS**: $1.60/月 (20GB)
- **Elastic IP**: $0/月 (インスタンス稼働中)
- **合計**: 約$21.18/月

## 🔧 手動デプロイ手順

### 1. Terraform変数を設定

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集
```

### 2. インフラストラクチャを作成

```bash
terraform init
terraform plan
terraform apply
```

### 3. アプリケーションをデプロイ

```bash
# IPアドレスを取得
PUBLIC_IP=$(terraform output -raw instance_public_ip)

# SSHでログイン
ssh -i ~/.ssh/tree-chat-key ubuntu@$PUBLIC_IP

# アプリケーションをクローン
git clone https://github.com/yourusername/tree-chat.git
cd tree-chat

# 環境変数を設定
cp .env.example .env
# .env を編集

# Dockerでビルド・起動
docker-compose up -d
```

## 🔐 セキュリティ設定

### SSH アクセス制限
`terraform.tfvars` で特定のIPアドレスからのみSSHを許可:
```hcl
ssh_allowed_ips = ["YOUR_IP/32"]
```

### SSL証明書の設定
Let's Encryptで無料SSL証明書を取得:
```bash
ssh ubuntu@$PUBLIC_IP
sudo certbot --nginx -d yourdomain.com
```

## 📝 運用コマンド

### ログ確認
```bash
ssh ubuntu@$PUBLIC_IP 'cd /home/ubuntu/app && docker-compose logs -f'
```

### アプリケーション再起動
```bash
ssh ubuntu@$PUBLIC_IP 'cd /home/ubuntu/app && docker-compose restart'
```

### インフラストラクチャ削除
```bash
cd terraform
terraform destroy
```

## 🐛 トラブルシューティング

### EC2インスタンスにSSH接続できない
1. Security GroupでSSHポート(22)が開いているか確認
2. 正しいSSHキーを使用しているか確認
3. IPアドレスが正しいか確認

### アプリケーションにアクセスできない
1. Docker Composeが起動しているか確認
2. Nginxが正しく設定されているか確認
3. Security Groupでポート80/443が開いているか確認

### Terraformエラー
1. AWS認証情報が正しく設定されているか確認
2. リージョンが正しいか確認
3. 必要なIAM権限があるか確認

## 📚 ディレクトリ構成

```
terraform/
├── main.tf              # メインのTerraform設定
├── variables.tf         # 変数定義
├── outputs.tf          # 出力定義
├── terraform.tfvars.example  # 変数値のサンプル
├── scripts/
│   └── user_data.sh    # EC2初期化スクリプト
└── README.md           # このファイル
```

## 🔄 アップデート手順

1. コードを更新
```bash
git pull origin main
```

2. Dockerイメージを再ビルド
```bash
docker-compose build
docker-compose up -d
```

## 📞 サポート

問題が発生した場合は、GitHubのIssueを作成してください。