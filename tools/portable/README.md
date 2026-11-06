# Ficha de Bolso portátil para Windows

Abra `Tagmar-Ficha-de-Bolso.exe` no Windows 64 bits com o Microsoft Edge WebView2 Runtime instalado. O executável abre a mesma ficha da versão HTML em uma janela própria.

O editor mantém os rascunhos em um perfil local do Windows, em `%LOCALAPPDATA%\Tagmar\Ficha de Bolso`. Use **Salvar JSON** para transferir uma ficha a outro computador.

## Compilar

Use Windows 64 bits com .NET Framework 4.8, Node.js 22 ou superior e Google Chrome. Baixe e descompacte o [SDK Microsoft.Web.WebView2 1.0.3650.58](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.3650.58).

Na raiz do projeto, instale as dependências e gere o HTML e o executável no PowerShell.

```powershell
npm install
npm run build
.\tools\portable\build.ps1 -WebViewSdk 'C:\caminho\para\sdk-extraido'
```

O executável e o ícone ficam em `outputs`. Consulte [as licenças do projeto](../../LICENSE.md) e os avisos do WebView2 incluídos no SDK.
