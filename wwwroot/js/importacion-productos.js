(() => {
    "use strict";

    const store = window.TedaStore;
    const options = window.tedaImportOptions;
    const byId = id => document.getElementById(id);
    const normalize = value => String(value ?? "").trim().toLocaleLowerCase("es")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
    const number = value => Math.max(0, Number(value) || 0);
    const money = value => new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number(value));
    const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    const nextId = items => items.length ? Math.max(...items.map(x => Number(x.id) || 0)) + 1 : 1;

    let result = null;
    let classified = [];

    function showMessage(message, type = "info") {
        const box = byId("importMessage");
        box.textContent = message;
        box.className = `alert alert-${type} mt-3 mb-0`;
    }

    function verifyAccess() {
        const allowed = store.hasPermission("importarProductos");
        byId("importApplication").classList.toggle("d-none", !allowed);
        byId("importAccessDenied").classList.toggle("d-none", allowed);
        return allowed;
    }

    function productKey(company, product, presentation) {
        return `${normalize(company)}|${normalize(product)}|${normalize(presentation)}`;
    }

    function classifyProducts() {
        const data = store.getAdminData();
        const companies = new Map((data.companies ?? []).map(c => [Number(c.id), c.name]));
        const existing = new Map((data.products ?? []).map(p => [
            productKey(companies.get(Number(p.companyId)), p.name, p.presentation), p
        ]));

        classified = result.productos.map(product => {
            const current = existing.get(productKey(product.empresa, product.nombre, product.presentacion));
            let status = "Nuevo";
            let detail = "Se creará el producto.";
            if (product.observacionImportacion) {
                status = "Requiere revisión";
                detail = product.observacionImportacion;
            } else if (current) {
                const changes = [];
                if (number(product.cantidadPorPaquete) !== number(current.packageQuantity)) changes.push("cantidad por paquete");
                if (number(product.precioVenta) !== number(current.salePrice)) changes.push("precio de venta");
                if (number(product.precioCosto) !== number(current.costPrice)) changes.push("precio costo");
                if (number(product.stockMinimo) !== number(current.minimumStock)) changes.push("stock mínimo");
                status = changes.length ? "Será actualizado" : "Ya existe";
                detail = changes.length ? `Cambiará: ${changes.join(", ")}.` : "No tiene cambios.";
            }
            return { ...product, status, detail };
        });
    }

    function badge(status) {
        const type = {
            "Nuevo": "success", "Será actualizado": "warning",
            "Ya existe": "secondary", "Requiere revisión": "danger"
        }[status] ?? "secondary";
        return `<span class="badge text-bg-${type}" title="${escapeHtml(status)}">${escapeHtml(status)}</span>`;
    }

    function renderPreview() {
        const filter = byId("resultFilter").value;
        const rows = classified.filter(x => filter === "Todos" || x.status === filter);
        byId("importPreviewBody").innerHTML = rows.map(p => `<tr title="${escapeHtml(p.detail)}">
            <td>${badge(p.status)}</td><td>${escapeHtml(p.codigo)}</td><td>${escapeHtml(p.empresa)}</td>
            <td class="text-start">${escapeHtml(p.nombre)}</td><td>${escapeHtml(p.presentacion)}</td>
            <td>${number(p.cantidadPorPaquete)}</td><td>Bs. ${money(p.precioVenta)}</td>
            <td>Bs. ${money(p.precioCosto)}</td><td>${number(p.stockMinimo)}</td>
            <td>${escapeHtml(p.hojaOrigen)} / ${p.filaOrigen}</td></tr>`).join("");
        byId("emptyImportPreview").classList.toggle("d-none", rows.length > 0);
    }

    async function analyze(event) {
        event.preventDefault();
        if (!verifyAccess()) return;
        const file = byId("excelFile").files[0];
        if (!file) return showMessage("Selecciona un archivo Excel.", "danger");
        if (!file.name.toLowerCase().endsWith(".xlsx")) return showMessage("El archivo debe tener extensión .xlsx.", "danger");
        if (file.size > options.maxBytes) return showMessage("El archivo supera el máximo permitido de 30 MB.", "danger");

        const button = byId("analyzeExcelButton");
        button.disabled = true;
        button.textContent = "Analizando…";
        showMessage("Leyendo y limpiando el archivo. Esto puede tardar unos segundos.", "info");
        try {
            const form = new FormData();
            form.append("archivo", file);
            const response = await fetch(options.analyzeUrl, { method: "POST", body: form });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.mensaje ?? "No se pudo analizar el archivo.");
            result = payload;
            classifyProducts();
            const companies = new Set(result.productos.map(p => normalize(p.empresa)).filter(Boolean));
            byId("statCompanies").textContent = companies.size;
            byId("statProducts").textContent = result.productos.length;
            byId("statDuplicates").textContent = result.duplicadosEliminados;
            byId("statReview").textContent = result.revisar.length;
            byId("previewSummary").textContent =
                `${result.hojasProcesadas} hojas y ${result.filasLeidas} filas analizadas en ${result.nombreArchivo}.`;
            byId("importPreview").classList.remove("d-none");
            renderPreview();
            showMessage("Análisis terminado. Revisa la vista previa antes de confirmar.", "success");
            store.addMovement({ actionType: "Análisis", module: "Importación", description: `Archivo analizado: ${file.name}` });
        } catch (error) {
            byId("importPreview").classList.add("d-none");
            showMessage(error.message, "danger");
        } finally {
            button.disabled = false;
            button.textContent = "Analizar archivo";
        }
    }

    function confirmImport() {
        if (!verifyAccess() || !result) return;
        if (!window.confirm("¿Confirmas la importación? Se crearán o actualizarán productos, pero no se eliminará ninguno.")) return;
        const data = store.getAdminData();
        data.companies ??= []; data.products ??= []; data.importHistory ??= []; data.importErrors ??= [];
        let companiesCreated = 0, created = 0, updated = 0, omitted = 0, errors = 0;

        classified.forEach(imported => {
            try {
                let company = data.companies.find(c => normalize(c.name) === normalize(imported.empresa));
                if (!company) {
                    company = { id: nextId(data.companies), name: imported.empresa, active: true };
                    data.companies.push(company); companiesCreated++;
                    store.addMovement({ actionType: "Creación", module: "Importación", company: company.name, description: "Empresa creada desde Excel." });
                }
                const current = data.products.find(p =>
                    Number(p.companyId) === Number(company.id) &&
                    normalize(p.name) === normalize(imported.nombre) &&
                    normalize(p.presentation) === normalize(imported.presentacion));
                if (current) {
                    if (imported.status === "Ya existe") { omitted++; return; }
                    const before = JSON.stringify(current);
                    current.packageQuantity = number(imported.cantidadPorPaquete) || current.packageQuantity || 1;
                    current.salePrice = number(imported.precioVenta);
                    current.costPrice = number(imported.precioCosto);
                    current.minimumStock = number(imported.stockMinimo);
                    current.active = normalize(imported.estado) !== "inactivo";
                    updated++;
                    store.addMovement({ actionType: "Actualización", module: "Importación", product: current.name,
                        company: company.name, description: imported.detail, previousValue: before, newValue: JSON.stringify(current) });
                } else {
                    data.products.push({
                        id: nextId(data.products), code: imported.codigo, companyId: company.id,
                        name: imported.nombre, presentation: imported.presentacion,
                        packageQuantity: number(imported.cantidadPorPaquete) || 1,
                        salePrice: number(imported.precioVenta), costPrice: number(imported.precioCosto),
                        previousBalance: 0, purchases: 0, systemSales: 0, weeklyAverage: 0,
                        minimumStock: number(imported.stockMinimo), active: normalize(imported.estado) !== "inactivo"
                    });
                    created++;
                    store.addMovement({ actionType: "Creación", module: "Importación", product: imported.nombre,
                        company: company.name, description: `Producto creado desde ${result.nombreArchivo}.` });
                }
            } catch (error) {
                errors++;
                data.importErrors.push({ dateTime: new Date().toISOString(), file: result.nombreArchivo,
                    product: imported.nombre, error: error.message });
            }
        });

        const user = store.currentUser();
        data.importHistory.push({
            id: nextId(data.importHistory), fileName: result.nombreArchivo, dateTime: new Date().toISOString(),
            userId: user?.id, user: user?.name, companiesCreated, productsCreated: created,
            productsUpdated: updated, productsOmitted: omitted, productsWithError: errors
        });
        store.saveAdminData(data);
        store.addMovement({ actionType: "Importación confirmada", module: "Importación",
            description: `${created} creados, ${updated} actualizados, ${omitted} omitidos y ${errors} errores.` });
        showMessage(`Importación guardada: ${created} productos creados, ${updated} actualizados, ${omitted} sin cambios y ${errors} errores.`, errors ? "warning" : "success");
        byId("confirmImportButton").disabled = true;
    }

    function downloadCatalog() {
        if (!result?.catalogoBase64) return;
        const bytes = Uint8Array.from(atob(result.catalogoBase64), c => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
        const link = document.createElement("a");
        link.href = url; link.download = "CatalogoMaestro_TeDa.xlsx"; link.click();
        URL.revokeObjectURL(url);
    }

    function reset() {
        result = null; classified = [];
        byId("excelImportForm").reset();
        byId("importPreview").classList.add("d-none");
        byId("importMessage").classList.add("d-none");
        byId("confirmImportButton").disabled = false;
    }

    byId("excelImportForm").addEventListener("submit", analyze);
    byId("resultFilter").addEventListener("change", renderPreview);
    byId("confirmImportButton").addEventListener("click", confirmImport);
    byId("downloadCatalogButton").addEventListener("click", downloadCatalog);
    byId("cancelImportButton").addEventListener("click", reset);
    verifyAccess();
})();
