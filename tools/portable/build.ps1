param(
    [Parameter(Mandatory = $true)]
    [string] $WebViewSdk,
    [string] $Playwright
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$sdk = (Resolve-Path -LiteralPath $WebViewSdk).Path
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$managed = Join-Path $sdk 'lib/net462'
$loader = Join-Path $sdk 'runtimes/win-x64/native/WebView2Loader.dll'
if ((Get-Item -LiteralPath $loader).VersionInfo.FileVersion -ne '1.0.3650.58') {
    throw 'Use o SDK Microsoft.Web.WebView2 1.0.3650.58.'
}

$output = Join-Path $root 'outputs'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$icon = Join-Path $output 'Ficha de Bolso.ico'
$executable = Join-Path $output 'Tagmar Ficha de Bolso.exe'
$html = Join-Path $root 'Ficha de Bolso.html'
$core = Join-Path $managed 'Microsoft.Web.WebView2.Core.dll'
$winforms = Join-Path $managed 'Microsoft.Web.WebView2.WinForms.dll'
$license = Join-Path $sdk 'LICENSE.txt'
$notice = Join-Path $sdk 'NOTICE.txt'

& node (Join-Path $PSScriptRoot 'build-icon.cjs') $icon $Playwright
if ($LASTEXITCODE) { throw 'A geração do ícone falhou.' }

& $compiler /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 `
    "/out:$executable" "/win32icon:$icon" `
    /reference:System.Drawing.dll /reference:System.Windows.Forms.dll "/reference:$core" "/reference:$winforms" `
    "/resource:$html,FichaDeBolso.html" "/resource:$core,Microsoft.Web.WebView2.Core.dll" `
    "/resource:$winforms,Microsoft.Web.WebView2.WinForms.dll" "/resource:$loader,WebView2Loader.dll" `
    "/resource:$license,WebView2.LICENSE.txt" "/resource:$notice,WebView2.NOTICE.txt" `
    (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE) { throw 'A compilação do executável falhou.' }
Get-Item -LiteralPath $executable
