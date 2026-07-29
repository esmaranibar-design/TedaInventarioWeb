using Microsoft.AspNetCore.Mvc;

namespace TedaInventarioWeb.Controllers;

public class MovimientosController : Controller
{
    [HttpGet]
    public IActionResult Index()
    {
        return View();
    }
}
