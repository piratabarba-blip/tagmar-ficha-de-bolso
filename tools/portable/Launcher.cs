using System;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("Tagmar Ficha de Bolso")]
[assembly: AssemblyProduct("Tagmar Ficha de Bolso")]
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]

internal static class Launcher
{
    private const string Title = "Tagmar Ficha de Bolso";

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr LoadLibraryEx(string path, IntPtr reserved, uint flags);

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        try
        {
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Tagmar", "Ficha de Bolso");
            string loader = Path.Combine(folder, "WebView2-1.0.3650.58", "WebView2Loader.dll");
            string editor = Path.Combine(folder, "editor", "Ficha de Bolso.html");
            using (var mutex = new Mutex(false, @"Local\Tagmar.FichaDeBolso.Preparar"))
            {
                try { mutex.WaitOne(); }
                catch (AbandonedMutexException) { }
                try
                {
                    WriteResource("FichaDeBolso.html", editor);
                    WriteResource("WebView2Loader.dll", loader);
                    WriteResource("WebView2.LICENSE.txt", Path.Combine(folder, "WebView2-LICENSE.txt"));
                    WriteResource("WebView2.NOTICE.txt", Path.Combine(folder, "WebView2-NOTICE.txt"));
                }
                finally { mutex.ReleaseMutex(); }
            }
            // Search the explicit DLL path and Windows system directories for its dependencies.
            if (LoadLibraryEx(loader, IntPtr.Zero, 0x00000900) == IntPtr.Zero)
                throw new Win32Exception(Marshal.GetLastWin32Error());
            AppDomain.CurrentDomain.AssemblyResolve += ResolveWebView;
            OpenEditor(new Uri(editor), Path.Combine(folder, "perfil"));
        }
        catch (Exception error)
        {
            ShowError("Não foi possível abrir a Ficha de Bolso.", error);
        }
    }

    private static Assembly ResolveWebView(object sender, ResolveEventArgs args)
    {
        string name = new AssemblyName(args.Name).Name;
        if (name != "Microsoft.Web.WebView2.Core" && name != "Microsoft.Web.WebView2.WinForms")
            return null;
        return Assembly.Load(ReadResource(name + ".dll"));
    }

    private static byte[] ReadResource(string name)
    {
        using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        using (var bytes = new MemoryStream())
        {
            stream.CopyTo(bytes);
            return bytes.ToArray();
        }
    }

    private static void WriteResource(string name, string path)
    {
        byte[] bytes = ReadResource(name);
        bool exists = File.Exists(path);
        if (exists && File.ReadAllBytes(path).SequenceEqual(bytes)) return;
        string directory = Path.GetDirectoryName(path);
        Directory.CreateDirectory(directory);
        string temporary = Path.Combine(directory, Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            File.WriteAllBytes(temporary, bytes);
            if (exists) File.Replace(temporary, path, null);
            else File.Move(temporary, path);
        }
        finally { File.Delete(temporary); }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static void OpenEditor(Uri editor, string profile)
    {
        Rectangle desktop = Screen.PrimaryScreen.WorkingArea;
        using (var icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath))
        using (var window = new Form
        {
            Text = Title,
            Icon = icon,
            BackColor = Color.FromArgb(15, 19, 23),
            StartPosition = FormStartPosition.CenterScreen,
            ClientSize = new Size(Math.Min(1480, desktop.Width - 72), Math.Min(1000, desktop.Height - 100)),
            MinimumSize = new Size(480, 440)
        })
        using (var view = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = window.BackColor })
        {
            window.Controls.Add(view);
            window.Shown += async (sender, args) =>
            {
                try
                {
                    CoreWebView2Environment runtime = await CoreWebView2Environment.CreateAsync(null, profile);
                    if (window.IsDisposed) return;
                    await view.EnsureCoreWebView2Async(runtime);
                    if (window.IsDisposed) return;
                    view.Source = editor;
                }
                catch (WebView2RuntimeNotFoundException error)
                {
                    ShowError("Instale o Microsoft Edge WebView2 Runtime para abrir a Ficha de Bolso.", error);
                    window.Close();
                }
                catch (Exception error)
                {
                    if (window.IsDisposed) return;
                    ShowError("Não foi possível carregar o editor.", error);
                    window.Close();
                }
            };
            Application.Run(window);
        }
    }

    private static void ShowError(string message, Exception error)
    {
        MessageBox.Show(message + "\n\n" + error.Message, Title, MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
}
