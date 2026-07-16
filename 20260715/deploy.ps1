# Multi-Site Production Deployer Engine (Direct File-Rewrite Method)

# Define your target site array matrix [Name, ScriptID]
$sites = @(
    @("Selby", "1pJ3reFFbKJ3z3cUEFXyrpkvpHMoXnp67YhvQmVUXsOY8fXNFkbQkEma0"),
    @("Gulf Gate", "15DZx4WYjZRhN-y1-UiU88Bem29GxzVZNDxrw2OanLfzso9ASHOHXU0J0"),
    @("Fruitville", "1ezXZkoJ8KWgiA3hZ-7bMhoqQSifrMyyS5W8evd9OPBxcBo1Dm9LH_t_0")
)

# 1. 🧹 Workspace Reset: Recreate a clean, isolated 'dist' folder
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
New-Item -ItemType Directory -Force -Path "dist" | Out-Null

# 2. 📋 Mirror Assets: Copy only the active application files into the clean directory
Copy-Item "appsscript.json" "dist\" -Force
Copy-Item "*.js" "dist\" -Force
Copy-Item "*.html" "dist\" -Force

# Loop systematically through each site and push from the clean directory
foreach ($site in $sites) {
    $name = $site[0]
    $id   = $site[1]
    
    Write-Host "---------------------------------------------" -ForegroundColor Cyan
    Write-Host "🚀 Starting Deployment Matrix Link to: $name" -ForegroundColor Yellow
    Write-Host "---------------------------------------------" -ForegroundColor Cyan
    
    # 3. ⚙️ Anchor Target: Write the clasp map pointing directly inside our text-named 'dist' root
    $jsonContent = '{"scriptId":"' + $id + '","rootDir":"./dist"}'
    [System.IO.File]::WriteAllText("$PWD\.clasp.json", $jsonContent)
    
    # 4. ⚡ Push the clean code assets cleanly up to the cloud spreadsheet container
    clasp push -f

    # 5. 🔄 Re-anchor back to your Test Site so you are always ready for a 'clasp pull'
    $testSiteJson = '{"scriptId":"1CfuanfXJHi053gODFnays3jLCZy4K4tEiZox40iiggcKm19-de3jkHIQ","rootDir":"."}'
    [System.IO.File]::WriteAllText("$PWD\.clasp.json", $testSiteJson)
}

Write-Host "`n✅ SUCCESS: All district site application arrays fully deployed and synchronized!" -ForegroundColor Green