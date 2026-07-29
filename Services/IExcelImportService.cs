using TedaInventarioWeb.Models;

namespace TedaInventarioWeb.Services;

public interface IExcelImportService
{
    ResultadoImportacion Analizar(Stream archivo, string nombreArchivo);
}
