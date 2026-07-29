namespace TedaInventarioWeb.ViewModels;

public class ImportarProductosViewModel
{
    public string Titulo { get; set; } = "Importar productos desde Excel";
    public long TamanoMaximoBytes { get; set; } = 30 * 1024 * 1024;
}
