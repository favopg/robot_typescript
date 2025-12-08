$ErrorActionPreference = 'Stop'

Write-Host "[nvm] nvm-windows インストーラを取得します..." -ForegroundColor Cyan

# 安定版バージョン（必要に応じて更新）
$version = '1.1.12'
$url = "https://github.com/coreybutler/nvm-windows/releases/download/$version/nvm-setup.exe"

# ダウンロード先
$temp = Join-Path $env:TEMP "nvm-setup-$version.exe"

try {
  Write-Host "[nvm] 取得元: $url" -ForegroundColor DarkCyan
  Invoke-WebRequest -Uri $url -OutFile $temp
  Write-Host "[nvm] ダウンロード完了: $temp" -ForegroundColor Green

  Write-Host "[nvm] インストーラを起動します（GUI が表示されます）。指示に従ってインストールしてください。" -ForegroundColor Yellow
  Start-Process -FilePath $temp -Wait

  Write-Host "[nvm] インストールが完了したら、新しい PowerShell を開いて次を実行してください:" -ForegroundColor Green
  Write-Host "    nvm version" -ForegroundColor White
  Write-Host "    nvm install 20.17.0" -ForegroundColor White
  Write-Host "    nvm use 20.17.0" -ForegroundColor White
  Write-Host "[nvm] その後、このプロジェクトで npm install を実行してください。" -ForegroundColor Green
}
catch {
  Write-Error "[nvm] インストール手順中にエラーが発生しました: $($_.Exception.Message)"
  exit 1
}
