# CEG Connect - Start Servers Script
# Run this script to start both frontend and backend servers

Write-Host "🚀 Starting CEG Connect Servers..." -ForegroundColor Green

# Start Backend Server
Write-Host "📡 Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\kalai\Downloads\ceg connect - Copy\ceg connect - Copy\backend'; npm start"

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend Server  
Write-Host "🌐 Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\kalai\Downloads\ceg connect - Copy\ceg connect - Copy\frontend'; npm run dev"

Write-Host "✅ Servers are starting..." -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "⏳ Please wait for both servers to fully start..." -ForegroundColor Yellow
