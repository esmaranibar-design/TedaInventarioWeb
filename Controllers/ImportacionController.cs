using Microsoft.AspNetCore.Mvc;
using TedaInventarioWeb.Services;
using TedaInventarioWeb.ViewModels;

namespace TedaInventarioWeb.Controllers;

public class ImportacionController(IExcelImportService excelImportService) : Controller
{
    private const long MaximoBytes = 30 * 1024 * 1024;

    [HttpGet]
    public IActionResult Productos() => View(new ImportarProductosViewModel());

    [HttpPost]
    [RequestSizeLimit(MaximoBytes)]
    public IActionResult Analizar(IFormFile? archivo)
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { mensaje = "Selecciona un archivo Excel con datos." });

        if (archivo.Length > MaximoBytes)
            return BadRequest(new { mensaje = "El archivo supera el máximo permitido de 30 MB." });

        if (!string.Equals(Path.GetExtension(archivo.FileName), ".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { mensaje = "El archivo debe tener extensión .xlsx." });

        try
        {
            using var stream = archivo.OpenReadStream();
            return Json(excelImportService.Analizar(stream, Path.GetFileName(archivo.FileName)));
        }
        catch (Exception ex)
        {
            return BadRequest(new { mensaje = $"No se pudo analizar el Excel: {ex.Message}" });
        }
    }
}
