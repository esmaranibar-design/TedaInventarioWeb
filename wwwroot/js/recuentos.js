(() => {
    "use strict";

    const ADMIN_KEY = "tedaInventario.admin.v1";
    const COUNTS_KEY = "tedaInventario.recuentos.v1";
    const SESSION_KEY = "tedaInventario.session.v1";
    const store = window.TedaStore;

    const byId = id => document.getElementById(id);
    const finiteNumber = value => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    const numberValue = value => Math.max(0, finiteNumber(value));
    const nextId = items => items.length ? Math.max(...items.map(item => Number(item.id))) + 1 : 1;
    const normalizeText = value => String(value ?? "").trim().toLocaleLowerCase("es")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
    const escapeHtml = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    const formatNumber = value => new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 }).format(finiteNumber(value));
    const formatMoney = value => `Bs. ${new Intl.NumberFormat("es-BO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numberValue(value))}`;
    const formatDateTime = value => new Intl.DateTimeFormat("es-BO", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(value));

    const defaultAdminData = {
        users: [
            { id: 1, name: "Ana Administradora", username: "admin", password: "Admin123*", role: "Administradora", active: true },
            { id: 2, name: "María Operaria", username: "operaria", password: "Opera123*", role: "Operaria", active: true }
        ],
        companies: [
            { id: 1, name: "Coca-Cola", active: true },
            { id: 2, name: "PIL", active: true },
            { id: 3, name: "Nestlé", active: true },
            { id: 4, name: "Delizia", active: true }
        ],
        locations: [
            { id: 1, code: "depositoGrande", name: "Depósito grande", active: true },
            { id: 2, code: "depositoChico", name: "Depósito chico", active: true },
            { id: 3, code: "heladeraDeposito", name: "Heladera depósito", active: true },
            { id: 4, code: "heladerasTienda", name: "Heladeras tienda", active: true },
            { id: 5, code: "mostrador", name: "Mostrador", active: true }
        ],
        products: [
            {
                id: 1, companyId: 1, name: "Coca-Cola 2 L", presentation: "2 L",
                packageQuantity: 8, salePrice: 12, costPrice: 10, previousBalance: 48,
                purchases: 16, systemSales: 48, weeklyAverage: 12, minimumStock: 20, active: true
            },
            {
                id: 2, companyId: 1, name: "Coca-Cola 500 ml", presentation: "500 ml",
                packageQuantity: 12, salePrice: 5, costPrice: 4, previousBalance: 60,
                purchases: 24, systemSales: 50, weeklyAverage: 18, minimumStock: 24, active: true
            },
            {
                id: 3, companyId: 2, name: "Leche PIL 1 L", presentation: "1 L",
                packageQuantity: 12, salePrice: 9, costPrice: 7.5, previousBalance: 36,
                purchases: 24, systemSales: 42, weeklyAverage: 15, minimumStock: 18, active: true
            },
            {
                id: 4, companyId: 4, name: "Yogur Delizia 1 L", presentation: "1 L",
                packageQuantity: 6, salePrice: 15, costPrice: 11.5, previousBalance: 30,
                purchases: 12, systemSales: 18, weeklyAverage: 6, minimumStock: 12, active: true
            }
        ]
    };

    const defaultCountsData = {
        currentCount: {
            id: 1,
            status: "Abierto",
            createdAt: new Date().toISOString(),
            finalizedAt: null
        },
        details: []
    };

    const readStorage = (key, fallback) => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : structuredClone(fallback);
        } catch {
            return structuredClone(fallback);
        }
    };

    const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    let adminData = store?.getAdminData() ?? readStorage(ADMIN_KEY, defaultAdminData);
    if (!adminData.companies?.length) adminData.companies = structuredClone(defaultAdminData.companies);
    if (!adminData.locations?.length) adminData.locations = structuredClone(defaultAdminData.locations);
    if (!adminData.products?.length) adminData.products = structuredClone(defaultAdminData.products);
    store?.saveAdminData(adminData);
    let countsData = readStorage(COUNTS_KEY, defaultCountsData);
    let currentUser = null;
    let masterDataMode = "company";

    const elements = {
        loginPanel: byId("loginPanel"),
        applicationPanel: byId("applicationPanel"),
        loginForm: byId("loginForm"),
        loginError: byId("loginError"),
        sessionSummary: byId("sessionSummary"),
        sessionUserName: byId("sessionUserName"),
        sessionRoleBadge: byId("sessionRoleBadge"),
        adminToolbar: byId("adminToolbar"),
        company: byId("empresa"),
        product: byId("producto"),
        form: byId("recuentoForm"),
        locations: byId("locationFields"),
        tableBody: byId("weeklyControlBody"),
        emptyTableMessage: byId("emptyTableMessage"),
        tableRecordCount: byId("tableRecordCount"),
        statusAlert: byId("countStatusAlert"),
        errorSummary: byId("formErrorSummary")
    };

    const isAdmin = () => currentUser?.role === "Administradora";
    const hasPermission = code => store?.hasPermission(code, currentUser) ?? isAdmin();
    const audit = data => store?.addMovement({ ...data, user: currentUser });
    const activeProduct = () => adminData.products.find(product => product.id === Number(elements.product.value));
    const activeCompany = product => adminData.companies.find(company => company.id === product?.companyId);

    function initializeStorage() {
        if (!localStorage.getItem(ADMIN_KEY)) {
            writeStorage(ADMIN_KEY, adminData);
        }
        if (!localStorage.getItem(COUNTS_KEY)) {
            writeStorage(COUNTS_KEY, countsData);
        }
    }

    function showToast(message, type = "success") {
        const toastElement = byId("appToast");
        byId("appToastBody").textContent = message;
        toastElement.className = `toast border-0 toast-${type}`;
        bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 3200 }).show();
    }

    function restoreSession() {
        try {
            const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            currentUser = adminData.users.find(user => user.id === session?.userId && user.active) ?? null;
        } catch {
            currentUser = null;
        }
        renderSession();
    }

    function renderSession() {
        const loggedIn = Boolean(currentUser);
        elements.loginPanel.classList.toggle("d-none", loggedIn);
        elements.applicationPanel.classList.toggle("d-none", !loggedIn);
        elements.sessionSummary.classList.toggle("d-none", !loggedIn);

        if (!loggedIn) return;

        elements.sessionUserName.textContent = currentUser.name;
        elements.sessionRoleBadge.textContent = currentUser.role;
        elements.sessionRoleBadge.className = `badge rounded-pill ${isAdmin() ? "text-bg-warning" : "text-bg-info"}`;
        applyPermissions();
        byId("operaria").value = currentUser.name;
        document.querySelectorAll(".admin-only-column").forEach(element => {
            element.classList.toggle("d-none", !hasPermission("editarConteos"));
        });
        renderAll();
    }

    function applyPermissions() {
        document.querySelectorAll(".permission-action").forEach(element => {
            element.classList.toggle("d-none", !hasPermission(element.dataset.permission));
        });
        const toolbarPermissions = [
            "agregarProductos", "editarProductos", "editarEmpresas", "prepararRecuentos",
            "editarConteos", "administrarUsuarios", "verMovimientos"
        ];
        elements.adminToolbar.classList.toggle("d-none",
            !toolbarPermissions.some(permission => hasPermission(permission)));
        byId("weeklyControlSection").classList.toggle("d-none", !hasPermission("verControlSemanal"));
        byId("countResultsSection").classList.toggle("d-none", !hasPermission("verResultadosRecuento"));
        byId("preparedDataSection").classList.toggle("d-none", !hasPermission("verDatosPreparados"));
        const canRegister = hasPermission("registrarConteos");
        const canEditFinalized = hasPermission("editarConteos");
        document.querySelectorAll(".js-location-quantity").forEach(input => {
            input.disabled = false;
            input.readOnly = !canRegister ||
                (countsData.currentCount.status === "Finalizado" && !canEditFinalized);
            input.classList.toggle("read-only-quantity", input.readOnly);
        });
        byId("observaciones").readOnly = !canRegister ||
            (countsData.currentCount.status === "Finalizado" && !canEditFinalized);
    }

    function renderAll() {
        renderCompanies();
        renderLocations();
        renderCountStatus();
        renderTable();
        clearProductForm(false);
    }

    function renderCompanies() {
        const selected = elements.company.value;
        const activeCompanies = adminData.companies.filter(company => company.active);
        elements.company.innerHTML = '<option value="">Selecciona una empresa</option>' +
            activeCompanies.map(company => `<option value="${company.id}">${escapeHtml(company.name)}</option>`).join("");
        elements.company.value = activeCompanies.some(company => String(company.id) === selected) ? selected : "";

        const filter = byId("tableCompanyFilter");
        const filterValue = filter.value;
        filter.innerHTML = '<option value="">Todas las empresas</option>' +
            activeCompanies.map(company => `<option value="${company.id}">${escapeHtml(company.name)}</option>`).join("");
        filter.value = activeCompanies.some(company => String(company.id) === filterValue) ? filterValue : "";

        const adminCompany = byId("adminProductCompany");
        adminCompany.innerHTML = activeCompanies.map(company =>
            `<option value="${company.id}">${escapeHtml(company.name)}</option>`).join("");

        renderProducts();
    }

    function renderProducts() {
        const companyId = Number(elements.company.value);
        const selected = elements.product.value;
        adminData = store?.getAdminData() ?? adminData;
        const products = adminData.products.filter(product =>
            product.active && Number(product.companyId) === companyId);

        elements.product.innerHTML = '<option value="">Selecciona un producto</option>' +
            products.map(product => `<option value="${product.id}">${escapeHtml(product.name)}</option>`).join("");
        elements.product.disabled = !companyId || products.length === 0 || !hasPermission("verProductos");
        elements.product.value = products.some(product => String(product.id) === selected) ? selected : "";
        byId("noProductsMessage").classList.toggle("d-none", !companyId || products.length > 0);
    }

    function renderLocations() {
        const locations = adminData.locations.filter(location => location.active);
        const product = activeProduct();
        const configuration = adminData.expectedConfigurations ?? [];
        const canViewExpected = hasPermission("verCantidadesEsperadas") || hasPermission("configurarCantidadesEsperadas");
        const canViewResults = hasPermission("verResultadosRecuento");
        elements.locations.innerHTML = locations.map(location => `
            <div class="col-12 col-sm-6 col-lg location-count-card">
                <label for="location-${escapeHtml(location.code)}" class="form-label fw-bold">${escapeHtml(location.name)}</label>
                ${canViewExpected ? `<div class="expected-value">Cantidad esperada:
                    <strong>${numberValue(configuration.find(x => Number(x.productId) === Number(product?.id) && Number(x.locationId) === Number(location.id))?.quantity)}</strong>
                </div>` : ""}
                <label class="form-label small" for="location-${escapeHtml(location.code)}">Encontrado</label>
                <input id="location-${escapeHtml(location.code)}"
                       class="form-control js-location-quantity"
                       data-location-id="${location.id}"
                       data-location-code="${escapeHtml(location.code)}"
                       data-expected="${numberValue(configuration.find(x => Number(x.productId) === Number(product?.id) && Number(x.locationId) === Number(location.id))?.quantity)}"
                       type="number" min="0" step="1" value="0" required inputmode="numeric" />
                ${canViewExpected && canViewResults ? '<div class="location-difference small mt-2">Diferencia: 0</div>' : ""}
                <div class="invalid-feedback">Ingresa una cantidad igual o mayor que cero.</div>
            </div>`).join("");

        document.querySelectorAll(".js-location-quantity").forEach(input => {
            input.addEventListener("input", calculateResults);
            input.addEventListener("blur", () => {
                if (input.value === "") input.value = "0";
                if (Number(input.value) < 0) input.value = "0";
                calculateResults();
            });
        });
        applyPermissions();
    }

    function loadSelectedProduct() {
        const product = activeProduct();
        const mappings = {
            presentacion: "presentation",
            cantidadPaquete: "packageQuantity",
            precioVenta: "salePrice",
            precioCosto: "costPrice",
            saldoAnterior: "previousBalance",
            compras: "purchases",
            ventasSistema: "systemSales",
            promedioSemanal: "weeklyAverage",
            stockMinimo: "minimumStock"
        };

        Object.entries(mappings).forEach(([elementId, property]) => {
            byId(elementId).value = product ? product[property] : "";
        });
        byId("productCodeDisplay").value = product?.code ?? "";
        byId("productBarcodeDisplay").value = product?.barcode ?? "";

        renderLocations();
        clearQuantities(false);
        const existing = countsData.details.find(detail => detail.productId === product?.id);
        if (existing) {
            existing.locationCounts.forEach(count => {
                const input = document.querySelector(`[data-location-id="${count.locationId}"]`);
                if (input) input.value = count.quantity;
            });
            byId("observaciones").value = existing.observations;
        }
        calculateResults();
    }

    function calculateResults() {
        const total = [...document.querySelectorAll(".js-location-quantity")]
            .reduce((sum, input) => sum + numberValue(input.value), 0);
        const totalExpected = [...document.querySelectorAll(".js-location-quantity")]
            .reduce((sum, input) => sum + numberValue(input.dataset.expected), 0);
        const salesByCount = numberValue(byId("saldoAnterior").value) +
            numberValue(byId("compras").value) - total;
        const systemSales = numberValue(byId("ventasSistema").value);
        const difference = salesByCount - systemSales;

        byId("reconteoTotal").value = total;
        byId("totalEsperado").value = totalExpected;
        byId("ventasReconteo").value = salesByCount;
        byId("diferencia").value = difference;

        let locationsCorrect = true;
        const locationDifferences = [];
        document.querySelectorAll(".js-location-quantity").forEach(input => {
            const locationDifference = numberValue(input.value) - numberValue(input.dataset.expected);
            locationsCorrect = locationsCorrect && locationDifference === 0;
            if (locationDifference !== 0) {
                const locationName = input.closest(".location-count-card")
                    ?.querySelector("label.fw-bold")?.textContent?.trim() ?? "Ubicación";
                const explanation = locationDifference > 0
                    ? `sobran ${formatNumber(locationDifference)}`
                    : `faltan ${formatNumber(Math.abs(locationDifference))}`;
                locationDifferences.push(`${locationName}: ${explanation}`);
            }
            const label = input.closest(".location-count-card")?.querySelector(".location-difference");
            if (label) {
                label.textContent = `Diferencia: ${formatNumber(locationDifference)}`;
                label.className = `location-difference small mt-2 ${locationDifference === 0 ? "text-success" : "text-danger"}`;
            }
        });
        const correct = difference === 0 && locationsCorrect;
        byId("diferencia").classList.toggle("result-correct", correct);
        byId("diferencia").classList.toggle("result-difference", !correct);
        byId("resultStatus").className = `result-status ${correct ? "result-status-correct" : "result-status-difference"}`;
        byId("resultIcon").textContent = correct ? "✓" : "!";
        byId("resultText").textContent = correct ? "Recuento correcto" : "Revisar diferencia";
        const differenceDetails = [...locationDifferences];
        if (difference !== 0) {
            if (!locationDifferences.length) {
                differenceDetails.push("Ubicaciones: todas coinciden");
            }
            const comparison = difference > 0
                ? `el reconteo supera al sistema por ${formatNumber(difference)}`
                : `el reconteo es menor que el sistema por ${formatNumber(Math.abs(difference))}`;
            differenceDetails.push(
                `Origen: ventas según sistema (${formatNumber(systemSales)}) no coincide con ventas según reconteo (${formatNumber(salesByCount)}); ${comparison}`
            );
        }
        byId("resultDetail").textContent = correct
            ? "Sin diferencia"
            : differenceDetails.join("\n");

        return { total, totalExpected, salesByCount, difference, correct, locationsCorrect, locationDifferences };
    }

    function calculateSuggestedOrder(product, manualTotal) {
        const targetStock = numberValue(product.weeklyAverage) * 4;
        const unitsToOrder = Math.max(0, targetStock - numberValue(manualTotal));
        return unitsToOrder <= 0 ? 0 : Math.ceil(unitsToOrder / Math.max(1, numberValue(product.packageQuantity)));
    }

    function clearQuantities(showMessage = true) {
        document.querySelectorAll(".js-location-quantity").forEach(input => {
            input.value = "0";
            input.setCustomValidity("");
        });
        byId("observaciones").value = "";
        elements.form.classList.remove("was-validated");
        elements.errorSummary.classList.add("d-none");
        calculateResults();
        if (showMessage) showToast("Cantidades limpiadas.", "info");
    }

    function clearProductForm(clearCompany = true) {
        if (clearCompany) elements.company.value = "";
        elements.product.value = "";
        renderProducts();
        ["presentacion", "cantidadPaquete", "precioVenta", "precioCosto", "saldoAnterior",
            "compras", "ventasSistema", "promedioSemanal", "stockMinimo"].forEach(id => {
            byId(id).value = "";
        });
        clearQuantities(false);
        updateDateTime();
    }

    function updateDateTime() {
        byId("fechaHora").value = formatDateTime(new Date());
    }

    function validateCountForm() {
        document.querySelectorAll(".js-location-quantity").forEach(input => {
            const valid = input.value !== "" && Number(input.value) >= 0;
            input.setCustomValidity(valid ? "" : "La cantidad debe ser igual o mayor que cero.");
        });
        const valid = elements.form.checkValidity() && Boolean(activeProduct());
        elements.form.classList.add("was-validated");
        elements.errorSummary.classList.toggle("d-none", valid);
        return valid;
    }

    function saveProductCount() {
        if (!hasPermission("registrarConteos")) {
            showToast("No tienes permiso para registrar conteos.", "danger");
            return;
        }
        if (countsData.currentCount.status === "Finalizado" && !hasPermission("editarConteos")) {
            showToast("El recuento está finalizado. La administradora debe reabrirlo.", "danger");
            return;
        }
        if (!validateCountForm()) {
            elements.errorSummary.focus();
            return;
        }

        const product = activeProduct();
        const company = activeCompany(product);
        const result = calculateResults();
        const locationCounts = [...document.querySelectorAll(".js-location-quantity")].map(input => ({
            locationId: Number(input.dataset.locationId),
            code: input.dataset.locationCode,
            expected: numberValue(input.dataset.expected),
            quantity: numberValue(input.value),
            difference: numberValue(input.value) - numberValue(input.dataset.expected)
        }));
        const detail = {
            id: countsData.details.find(item => item.productId === product.id)?.id ?? nextId(countsData.details),
            countId: countsData.currentCount.id,
            productId: product.id,
            productCode: product.code ?? "",
            barcode: product.barcode ?? "",
            productName: product.name,
            companyId: company.id,
            companyName: company.name,
            presentation: product.presentation,
            packageQuantity: product.packageQuantity,
            salePrice: product.salePrice,
            costPrice: product.costPrice,
            previousBalance: product.previousBalance,
            purchases: product.purchases,
            systemSales: product.systemSales,
            weeklyAverage: product.weeklyAverage,
            minimumStock: product.minimumStock,
            locationCounts,
            expectedTotal: result.totalExpected,
            manualTotal: result.total,
            salesByCount: result.salesByCount,
            difference: result.difference,
            suggestedPackages: calculateSuggestedOrder(product, result.total),
            status: result.correct ? "Correcto" : "Con diferencia",
            observations: byId("observaciones").value.trim(),
            countedAt: new Date().toISOString(),
            operatorId: currentUser.id,
            operatorName: currentUser.name
        };

        const index = countsData.details.findIndex(item => item.productId === product.id);
        const previousDetail = index >= 0 ? countsData.details[index] : null;
        if (index >= 0) countsData.details[index] = detail;
        else countsData.details.push(detail);

        writeStorage(COUNTS_KEY, countsData);
        audit({
            actionType: previousDetail ? "Modificación" : "Registro",
            module: "Conteos",
            description: `${previousDetail ? "Se modificó" : "Se registró"} el conteo de ${product.name}.`,
            product: product.name,
            company: company.name,
            previousValue: previousDetail ? `Total ${previousDetail.manualTotal}; diferencia ${previousDetail.difference}` : "",
            newValue: `Total ${detail.manualTotal}; diferencia ${detail.difference}`
        });
        renderTable();
        updateDateTime();
        showToast("Recuento guardado correctamente");
    }

    function getLocationQuantity(detail, code) {
        return detail.locationCounts.find(count => count.code === code)?.quantity ?? 0;
    }

    function getFilteredDetails() {
        const search = normalizeText(byId("tableSearch").value);
        const companyId = Number(byId("tableCompanyFilter").value);
        const status = byId("tableStatusFilter").value;
        return countsData.details.filter(detail =>
            (!search || normalizeText(detail.productName).includes(search)) &&
            (!companyId || Number(detail.companyId) === companyId) &&
            (!status || detail.status === status));
    }

    function renderTable() {
        if (!currentUser) return;
        if (!hasPermission("verControlSemanal")) {
            elements.tableBody.innerHTML = "";
            elements.emptyTableMessage.classList.remove("d-none");
            elements.tableRecordCount.textContent = "0 productos";
            return;
        }
        const details = getFilteredDetails();

        elements.tableBody.innerHTML = details.map(detail => {
            const correct = detail.status === "Correcto";
            const packageLabel = detail.suggestedPackages === 1 ? "paquete" : "paquetes";
            return `
                <tr>
                    <td>${escapeHtml(detail.productName)}</td>
                    <td>${escapeHtml(detail.companyName)}</td>
                    <td>${escapeHtml(detail.presentation)}</td>
                    <td>${formatNumber(detail.packageQuantity)}</td>
                    <td>${formatMoney(detail.salePrice)}</td>
                    <td>${formatMoney(detail.costPrice)}</td>
                    <td>${formatNumber(detail.previousBalance)}</td>
                    <td>${formatNumber(detail.purchases)}</td>
                    <td>${formatNumber(getLocationQuantity(detail, "depositoGrande"))}</td>
                    <td>${formatNumber(getLocationQuantity(detail, "depositoChico"))}</td>
                    <td>${formatNumber(getLocationQuantity(detail, "heladeraDeposito"))}</td>
                    <td>${formatNumber(getLocationQuantity(detail, "heladerasTienda"))}</td>
                    <td>${formatNumber(getLocationQuantity(detail, "mostrador"))}</td>
                    <td>${formatNumber(detail.manualTotal)}</td>
                    <td>${formatNumber(detail.salesByCount)}</td>
                    <td>${formatNumber(detail.systemSales)}</td>
                    <td class="${correct ? "text-success" : "text-danger"} fw-bold">${formatNumber(detail.difference)}</td>
                    <td>${escapeHtml(formatDateTime(detail.countedAt))}</td>
                    <td>${escapeHtml(detail.operatorName)}</td>
                    <td>${formatNumber(detail.weeklyAverage)}</td>
                    <td>${formatNumber(detail.minimumStock)}</td>
                    <td class="suggested-order">${detail.suggestedPackages} ${packageLabel}</td>
                    <td><span class="badge ${correct ? "text-bg-success" : "text-bg-danger"}">${correct ? "✓ Correcto" : "! Con diferencia"}</span></td>
                    <td>${escapeHtml(detail.observations || "—")}</td>
                    <td class="admin-only-column ${hasPermission("editarConteos") ? "" : "d-none"}">
                        <button class="btn btn-sm btn-outline-primary js-edit-detail" type="button"
                                data-product-id="${detail.productId}">Editar</button>
                    </td>
                </tr>`;
        }).join("");

        elements.emptyTableMessage.classList.toggle("d-none", details.length > 0);
        elements.tableRecordCount.textContent = `${details.length} ${details.length === 1 ? "producto" : "productos"}`;
        document.querySelectorAll(".js-edit-detail").forEach(button => {
            button.addEventListener("click", () => loadDetailForEdit(Number(button.dataset.productId)));
        });
    }

    function loadDetailForEdit(productId) {
        if (!hasPermission("editarConteos")) return;
        const product = adminData.products.find(item => item.id === productId);
        if (!product) return;
        elements.company.value = String(product.companyId);
        renderProducts();
        elements.product.value = String(product.id);
        loadSelectedProduct();
        window.scrollTo({ top: elements.form.offsetTop - 20, behavior: "smooth" });
    }

    function moveToNextProduct() {
        const options = [...elements.product.options].filter(option => option.value);
        if (!options.length) return;
        const currentIndex = options.findIndex(option => option.value === elements.product.value);
        const next = options[(currentIndex + 1) % options.length];
        elements.product.value = next.value;
        loadSelectedProduct();
        elements.product.focus();
    }

    function renderCountStatus() {
        const finalized = countsData.currentCount.status === "Finalizado";
        elements.statusAlert.classList.toggle("d-none", !finalized);
        elements.statusAlert.className = finalized ? "alert alert-warning" : "alert alert-info d-none";
        elements.statusAlert.textContent = finalized
            ? `Recuento finalizado el ${formatDateTime(countsData.currentCount.finalizedAt)}.`
            : "";
        byId("reopenCountButton").classList.toggle("d-none", !finalized || !hasPermission("editarConteos"));
        const canEditFinalized = hasPermission("editarConteos");
        byId("saveProductCountButton").disabled =
            !hasPermission("registrarConteos") || (finalized && !canEditFinalized);
        byId("nextProductButton").disabled =
            !hasPermission("registrarConteos") || (finalized && !canEditFinalized);
        document.querySelectorAll(".js-location-quantity").forEach(input => {
            input.disabled = false;
            input.readOnly = !hasPermission("registrarConteos") || (finalized && !canEditFinalized);
            input.classList.toggle("read-only-quantity", input.readOnly);
        });
        renderProducts();
    }

    function finalizeCount() {
        if (!hasPermission("finalizarRecuentos")) {
            showToast("No tienes permiso para finalizar recuentos.", "danger");
            return;
        }
        if (!countsData.details.length) {
            showToast("Guarda al menos un producto antes de finalizar.", "danger");
            return;
        }
        countsData.currentCount.status = "Finalizado";
        countsData.currentCount.finalizedAt = new Date().toISOString();
        writeStorage(COUNTS_KEY, countsData);
        audit({
            actionType: "Finalización",
            module: "Recuentos",
            description: `Se finalizó el recuento ${countsData.currentCount.id}.`,
            newValue: "Finalizado"
        });
        renderCountStatus();
        showToast("Recuento finalizado.", "info");
    }

    function reopenCount() {
        if (!hasPermission("editarConteos")) return;
        countsData.currentCount.status = "Abierto";
        countsData.currentCount.finalizedAt = null;
        writeStorage(COUNTS_KEY, countsData);
        audit({
            actionType: "Reapertura",
            module: "Recuentos",
            description: `Se reabrió el recuento ${countsData.currentCount.id}.`,
            previousValue: "Finalizado",
            newValue: "Abierto"
        });
        renderCountStatus();
        showToast("El recuento fue reabierto.");
    }

    function prepareCount() {
        if (!hasPermission("prepararRecuentos")) return;
        if (countsData.currentCount.status === "Finalizado") {
            showToast("Reabre el recuento actual o finalízalo antes de preparar otro.", "danger");
            return;
        }
        countsData.currentCount = {
            id: countsData.currentCount.id + 1,
            status: "Abierto",
            createdAt: new Date().toISOString(),
            finalizedAt: null
        };
        countsData.details = [];
        writeStorage(COUNTS_KEY, countsData);
        audit({
            actionType: "Preparación",
            module: "Recuentos",
            description: `Se preparó el recuento ${countsData.currentCount.id}.`,
            newValue: "Abierto"
        });
        renderAll();
        showToast("Nuevo recuento preparado para la operaria.");
    }

    function openProductModal(mode) {
        const permission = mode === "edit" ? "editarProductos" : "agregarProductos";
        if (!hasPermission(permission)) return;
        const editing = mode === "edit";
        const product = editing ? activeProduct() : null;
        if (editing && !product) {
            showToast("Selecciona primero el producto que quieres editar.", "danger");
            return;
        }

        byId("productModalTitle").textContent = editing ? "Editar producto" : "Nuevo producto";
        byId("adminProductSaveButton").textContent = editing ? "Guardar cambios" : "Guardar producto";
        byId("productAdminForm").reset();
        byId("adminProductId").value = product?.id ?? "";
        byId("adminProductCode").value = product?.code ?? `TEDA-${String(nextId(adminData.products)).padStart(6, "0")}`;
        byId("adminProductBarcode").value = product?.barcode ?? "";
        byId("adminProductCompany").value = product?.companyId ?? adminData.companies.find(company => company.active)?.id ?? "";
        byId("adminProductName").value = product?.name ?? "";
        byId("adminProductPresentation").value = product?.presentation ?? "";
        byId("adminPackageQuantity").value = product?.packageQuantity ?? 1;
        byId("adminSalePrice").value = product?.salePrice ?? 0;
        byId("adminCostPrice").value = product?.costPrice ?? 0;
        byId("adminPreviousBalance").value = product?.previousBalance ?? 0;
        byId("adminPurchases").value = product?.purchases ?? 0;
        byId("adminSystemSales").value = product?.systemSales ?? 0;
        byId("adminWeeklyAverage").value = product?.weeklyAverage ?? 0;
        byId("adminMinimumStock").value = product?.minimumStock ?? 0;
        byId("adminProductActive").checked = product?.active ?? true;
        byId("adminProductActive").disabled = !hasPermission("eliminarProductos");
        byId("adminProductActiveGroup").classList.toggle("d-none", !hasPermission("eliminarProductos"));
        const stateButton = byId("toggleAdminProductState");
        stateButton.classList.toggle("d-none", !editing || !hasPermission("eliminarProductos"));
        stateButton.textContent = product?.active ? "Desactivar" : "Reactivar";
        stateButton.className = `btn ${product?.active ? "btn-outline-danger" : "btn-outline-success"} ${
            !editing || !hasPermission("eliminarProductos") ? "d-none" : ""}`;
        renderExpectedAdminFields(product);
        bootstrap.Modal.getOrCreateInstance(byId("productModal")).show();
    }

    function renderExpectedAdminFields(product) {
        const canConfigure = hasPermission("configurarCantidadesEsperadas");
        const configurations = adminData.expectedConfigurations ?? [];
        byId("adminExpectedLocations").innerHTML = adminData.locations.filter(x => x.active).map(location => {
            const quantity = configurations.find(x => Number(x.productId) === Number(product?.id) &&
                Number(x.locationId) === Number(location.id))?.quantity ?? 0;
            return `<div class="col-12 col-sm-6 col-lg">
                <label class="form-label small" for="expected-${location.id}">${escapeHtml(location.name)}</label>
                <input id="expected-${location.id}" class="form-control admin-expected-input" type="number"
                    min="0" step="1" value="${numberValue(quantity)}" data-location-id="${location.id}"
                    ${canConfigure ? "" : "readonly"} />
            </div>`;
        }).join("");
    }

    function saveAdminProduct(event) {
        event.preventDefault();
        const id = Number(byId("adminProductId").value);
        const requiredPermission = id ? "editarProductos" : "agregarProductos";
        if (!hasPermission(requiredPermission) || !event.currentTarget.checkValidity()) {
            event.currentTarget.classList.add("was-validated");
            return;
        }
        const existing = adminData.products.find(item => item.id === id);
        const productName = byId("adminProductName").value.trim();
        const code = byId("adminProductCode").value.trim();
        const barcode = byId("adminProductBarcode").value.trim();
        const companyId = Number(byId("adminProductCompany").value);
        const identityChanged = !existing ||
            Number(existing.companyId) !== companyId ||
            normalizeText(existing.name) !== normalizeText(productName);
        const duplicate = identityChanged && adminData.products.some(item =>
            Number(item.id) !== id && Number(item.companyId) === companyId &&
            normalizeText(item.name) === normalizeText(productName));
        if (duplicate) {
            showToast("Ya existe un producto con ese nombre en la empresa seleccionada.", "danger");
            return;
        }
        const barcodeChanged = !existing || normalizeText(existing.barcode) !== normalizeText(barcode);
        if (barcodeChanged && adminData.products.some(item => Number(item.id) !== id && barcode &&
            normalizeText(item.barcode) === normalizeText(barcode))) {
            showToast("Ese código de barras ya está asignado a otro producto.", "danger");
            return;
        }
        if (existing?.active && hasPermission("eliminarProductos") && !byId("adminProductActive").checked &&
            !window.confirm(`¿Desactivar el producto "${existing.name}"?`)) {
            byId("adminProductActive").checked = true;
            return;
        }
        const product = {
            ...(existing ?? {}),
            id: id || nextId(adminData.products),
            companyId,
            code: code || existing?.code || `TEDA-${String(id || nextId(adminData.products)).padStart(6, "0")}`,
            barcode: barcode || existing?.barcode || "",
            name: productName || existing?.name || "",
            presentation: byId("adminProductPresentation").value.trim() || existing?.presentation || "",
            packageQuantity: Math.max(1, numberValue(byId("adminPackageQuantity").value)),
            salePrice: numberValue(byId("adminSalePrice").value),
            costPrice: numberValue(byId("adminCostPrice").value),
            previousBalance: numberValue(byId("adminPreviousBalance").value),
            purchases: numberValue(byId("adminPurchases").value),
            systemSales: numberValue(byId("adminSystemSales").value),
            weeklyAverage: numberValue(byId("adminWeeklyAverage").value),
            minimumStock: numberValue(byId("adminMinimumStock").value),
            active: hasPermission("eliminarProductos")
                ? byId("adminProductActive").checked
                : (existing?.active ?? true)
        };

        const index = adminData.products.findIndex(item => item.id === id);
        if (index >= 0) adminData.products[index] = product;
        else adminData.products.push(product);
        if (hasPermission("configurarCantidadesEsperadas")) {
            adminData.expectedConfigurations ??= [];
            document.querySelectorAll(".admin-expected-input").forEach(input => {
                const locationId = Number(input.dataset.locationId);
                const old = adminData.expectedConfigurations.find(x =>
                    Number(x.productId) === Number(product.id) && Number(x.locationId) === locationId);
                const quantity = numberValue(input.value);
                const previousQuantity = numberValue(old?.quantity);
                if (old) old.quantity = quantity;
                else adminData.expectedConfigurations.push({
                    id: nextId(adminData.expectedConfigurations), productId: product.id, locationId, quantity
                });
                if (previousQuantity !== quantity) {
                    const location = adminData.locations.find(x => Number(x.id) === locationId);
                    audit({
                        actionType: "Configuración", module: "Cantidades esperadas",
                        description: `Se cambió la cantidad esperada de ${product.name} en ${location?.name ?? "ubicación"}.`,
                        product: product.name,
                        company: adminData.companies.find(x => Number(x.id) === Number(product.companyId))?.name ?? "",
                        previousValue: previousQuantity,
                        newValue: quantity
                    });
                }
            });
        }
        store?.saveAdminData(adminData) ?? writeStorage(ADMIN_KEY, adminData);
        audit({
            actionType: existing && existing.active !== product.active
                ? (product.active ? "Activación" : "Desactivación")
                : (index >= 0 ? "Edición" : "Creación"),
            module: "Productos",
            description: `${index >= 0 ? "Se editó" : "Se creó"} el producto ${product.name}.`,
            product: product.name,
            company: adminData.companies.find(company => company.id === product.companyId)?.name ?? "",
            previousValue: existing ? JSON.stringify(existing) : "",
            newValue: JSON.stringify(product)
        });
        if (existing && existing.purchases !== product.purchases) {
            audit({
                actionType: "Registro de compras",
                module: "Productos",
                description: `Se actualizaron las compras de ${product.name}.`,
                product: product.name,
                previousValue: existing.purchases,
                newValue: product.purchases
            });
        }
        if (existing && existing.systemSales !== product.systemSales) {
            audit({
                actionType: "Registro de ventas",
                module: "Productos",
                description: `Se actualizaron las ventas según sistema de ${product.name}.`,
                product: product.name,
                previousValue: existing.systemSales,
                newValue: product.systemSales
            });
        }
        renderCompanies();
        elements.company.value = String(product.companyId);
        renderProducts();
        if (product.active) {
            elements.product.value = String(product.id);
            loadSelectedProduct();
        }
        bootstrap.Modal.getInstance(byId("productModal")).hide();
        showToast(index >= 0 ? "Producto actualizado correctamente" : "Producto creado.");
    }

    async function exportFilteredTable() {
        if (!hasPermission("exportarDatos")) {
            showToast("No tienes permiso para exportar tablas.", "danger");
            return;
        }
        const details = getFilteredDetails();
        if (!details.length) {
            showToast("No hay datos para exportar", "danger");
            return;
        }
        const payload = details.map(detail => ({
            fechaHora: detail.countedAt,
            empresa: detail.companyName,
            codigoProducto: detail.productCode ?? "",
            codigoBarras: detail.barcode ?? "",
            producto: detail.productName,
            presentacion: detail.presentation,
            usuario: detail.operatorName,
            ubicaciones: (detail.locationCounts ?? []).map(location => ({
                nombre: adminData.locations.find(x => Number(x.id) === Number(location.locationId))?.name ?? location.code,
                esperado: numberValue(location.expected),
                encontrado: numberValue(location.quantity)
            })),
            totalEsperado: numberValue(detail.expectedTotal ?? (detail.locationCounts ?? [])
                .reduce((sum, location) => sum + numberValue(location.expected), 0)),
            totalEncontrado: numberValue(detail.manualTotal),
            ventasSegunRecuento: numberValue(detail.salesByCount),
            ventasSegunSistema: numberValue(detail.systemSales),
            diferencia: finiteNumber(detail.difference),
            estado: detail.status,
            observaciones: detail.observations ?? ""
        }));
        try {
            const response = await fetch("/Recuentos/Exportar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.mensaje ?? "No se pudo exportar.");
            }
            const blob = await response.blob();
            const disposition = response.headers.get("content-disposition") ?? "";
            const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
            const fileName = decodeURIComponent(match?.[1] ?? match?.[2] ?? "Recuentos_TeDa.xlsx");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
            audit({ actionType: "Exportación", module: "Recuentos",
                description: `Se exportaron ${details.length} registros filtrados a Excel.` });
            showToast("Tabla exportada correctamente.");
        } catch (error) {
            showToast(error.message, "danger");
        }
    }

    function selectProduct(product, source) {
        if (!product) return;
        elements.company.value = String(product.companyId);
        renderProducts();
        elements.product.value = String(product.id);
        loadSelectedProduct();
        audit({
            actionType: "Selección", module: "Productos",
            description: `Producto seleccionado mediante ${source}.`,
            product: product.name,
            company: activeCompany(product)?.name ?? ""
        });
    }

    function searchProductsByName() {
        if (!hasPermission("buscarProductos")) return;
        const term = normalizeText(byId("productSearch").value);
        const results = term ? adminData.products.filter(product =>
            product.active && normalizeText(product.name).includes(term)).slice(0, 12) : [];
        const container = byId("productSearchResults");
        container.innerHTML = results.map(product => {
            const company = adminData.companies.find(x => Number(x.id) === Number(product.companyId));
            return `<button class="product-search-result" type="button" data-product-id="${product.id}">
                <strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(company?.name ?? "")} · ${escapeHtml(product.presentation)}</small>
            </button>`;
        }).join("");
        container.classList.toggle("d-none", !term);
        if (term && !results.length) container.innerHTML = '<div class="p-3 text-secondary">Producto no encontrado</div>';
        container.querySelectorAll("[data-product-id]").forEach(button =>
            button.addEventListener("click", () => {
                selectProduct(adminData.products.find(x => Number(x.id) === Number(button.dataset.productId)), "búsqueda por nombre");
                container.classList.add("d-none");
            }));
    }

    function searchByBarcode() {
        if (!hasPermission("buscarCodigoBarras")) return;
        const barcode = normalizeText(byId("barcodeSearch").value);
        const product = adminData.products.find(x => x.active && barcode && normalizeText(x.barcode) === barcode);
        const message = byId("barcodeMessage");
        if (!product) {
            message.textContent = "Producto no encontrado";
            message.className = "form-text text-danger";
            audit({ actionType: "Búsqueda", module: "Productos", description: `Código de barras no encontrado: ${barcode}` });
            return;
        }
        message.textContent = `Producto encontrado: ${product.name}`;
        message.className = "form-text text-success";
        selectProduct(product, "código de barras");
    }

    function openMasterDataModal(mode) {
        const permission = mode === "company" ? "editarEmpresas" : "editarEmpresas";
        if (!hasPermission(permission)) return;
        masterDataMode = mode;
        byId("masterDataModalTitle").textContent = mode === "company" ? "Editar empresas" : "Editar ubicaciones";
        byId("masterDataName").placeholder = mode === "company" ? "Nueva empresa" : "Nueva ubicación";
        byId("masterDataAddGroup").classList.toggle("d-none",
            mode === "company" && !hasPermission("agregarEmpresas"));
        renderMasterDataList();
        bootstrap.Modal.getOrCreateInstance(byId("masterDataModal")).show();
    }

    function masterItems() {
        return masterDataMode === "company" ? adminData.companies : adminData.locations;
    }

    function renderMasterDataList() {
        byId("masterDataList").innerHTML = masterItems().map(item => `
            <div class="list-group-item d-flex align-items-center gap-2" data-master-id="${item.id}">
                <input class="form-control form-control-sm master-name-input" value="${escapeHtml(item.name)}" />
                <button class="btn btn-sm btn-outline-primary js-save-master" type="button">Guardar</button>
                <button class="btn btn-sm ${item.active ? "btn-outline-danger" : "btn-outline-success"} js-toggle-master"
                        type="button">${item.active ? "Desactivar" : "Activar"}</button>
            </div>`).join("");
        document.querySelectorAll(".js-save-master").forEach(button => {
            button.addEventListener("click", () => updateMasterItem(button.closest("[data-master-id]")));
        });
        document.querySelectorAll(".js-toggle-master").forEach(button => {
            button.addEventListener("click", () => toggleMasterItem(button.closest("[data-master-id]")));
        });
    }

    function addMasterItem() {
        if (masterDataMode === "company" && !hasPermission("agregarEmpresas")) return;
        if (masterDataMode === "location" && !hasPermission("editarEmpresas")) return;
        const input = byId("masterDataName");
        const name = input.value.trim();
        if (!name) return;
        const items = masterItems();
        if (items.some(item => item.name.toLowerCase() === name.toLowerCase())) {
            showToast("Ya existe un registro con ese nombre.", "danger");
            return;
        }
        const item = { id: nextId(items), name, active: true };
        if (masterDataMode === "location") {
            item.code = `ubicacion${item.id}`;
        }
        items.push(item);
        store?.saveAdminData(adminData) ?? writeStorage(ADMIN_KEY, adminData);
        audit({
            actionType: "Creación",
            module: masterDataMode === "company" ? "Empresas" : "Ubicaciones",
            description: `Se creó ${masterDataMode === "company" ? "la empresa" : "la ubicación"} ${name}.`,
            company: masterDataMode === "company" ? name : "",
            newValue: name
        });
        input.value = "";
        renderMasterDataList();
        renderCompanies();
        renderLocations();
    }

    function updateMasterItem(container) {
        if (!hasPermission("editarEmpresas")) return;
        const item = masterItems().find(entry => entry.id === Number(container.dataset.masterId));
        const name = container.querySelector("input").value.trim();
        if (!item || !name) return;
        const previousName = item.name;
        item.name = name;
        store?.saveAdminData(adminData) ?? writeStorage(ADMIN_KEY, adminData);
        audit({
            actionType: "Edición",
            module: masterDataMode === "company" ? "Empresas" : "Ubicaciones",
            description: `Se cambió el nombre de ${previousName} a ${name}.`,
            company: masterDataMode === "company" ? name : "",
            previousValue: previousName,
            newValue: name
        });
        renderCompanies();
        renderLocations();
        renderMasterDataList();
        showToast("Nombre actualizado.");
    }

    function toggleMasterItem(container) {
        if (masterDataMode === "company" && !hasPermission("eliminarEmpresas")) return;
        if (masterDataMode === "location" && !hasPermission("editarEmpresas")) return;
        const item = masterItems().find(entry => entry.id === Number(container.dataset.masterId));
        if (!item) return;
        item.active = !item.active;
        store?.saveAdminData(adminData) ?? writeStorage(ADMIN_KEY, adminData);
        audit({
            actionType: item.active ? "Activación" : "Desactivación",
            module: masterDataMode === "company" ? "Empresas" : "Ubicaciones",
            description: `Se ${item.active ? "activó" : "desactivó"} ${item.name}.`,
            company: masterDataMode === "company" ? item.name : "",
            newValue: item.active ? "Activo" : "Inactivo"
        });
        renderCompanies();
        renderLocations();
        renderMasterDataList();
    }

    function bindEvents() {
        elements.loginForm.addEventListener("submit", event => {
            event.preventDefault();
            const username = byId("loginUser").value.trim();
            const password = byId("loginPassword").value;
            const user = adminData.users.find(item =>
                item.active && item.username === username &&
                item.password === (store?.hashPassword(password) ?? password));
            elements.loginError.classList.toggle("d-none", Boolean(user));
            if (!user) return;
            user.lastAccess = new Date().toISOString();
            store?.saveAdminData(adminData) ?? writeStorage(ADMIN_KEY, adminData);
            currentUser = user;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
            audit({
                actionType: "Inicio de sesión",
                module: "Seguridad",
                description: `El usuario ${user.username} inició sesión.`
            });
            event.currentTarget.reset();
            renderSession();
        });

        byId("logoutButton").addEventListener("click", () => {
            audit({
                actionType: "Cierre de sesión",
                module: "Seguridad",
                description: `El usuario ${currentUser.username} cerró sesión.`
            });
            sessionStorage.removeItem(SESSION_KEY);
            currentUser = null;
            renderSession();
        });
        elements.company.addEventListener("change", () => {
            renderProducts();
            loadSelectedProduct();
        });
        elements.product.addEventListener("change", loadSelectedProduct);
        byId("productSearch").addEventListener("input", searchProductsByName);
        byId("clearProductSearch").addEventListener("click", () => {
            byId("productSearch").value = "";
            byId("productSearchResults").classList.add("d-none");
        });
        byId("barcodeSearchButton").addEventListener("click", searchByBarcode);
        byId("exportExcelButton").addEventListener("click", exportFilteredTable);
        byId("barcodeSearch").addEventListener("keydown", event => {
            if (event.key === "Enter") { event.preventDefault(); searchByBarcode(); }
        });
        elements.form.addEventListener("submit", event => {
            event.preventDefault();
            saveProductCount();
        });
        byId("clearQuantitiesButton").addEventListener("click", () => clearQuantities());
        byId("nextProductButton").addEventListener("click", moveToNextProduct);
        document.querySelectorAll(".js-finalize-count").forEach(button => button.addEventListener("click", finalizeCount));
        byId("reopenCountButton").addEventListener("click", reopenCount);
        byId("prepareCountButton").addEventListener("click", prepareCount);
        document.querySelector('[data-admin-action="new-product"]').addEventListener("click", () => openProductModal("new"));
        document.querySelector('[data-admin-action="edit-product"]').addEventListener("click", () => openProductModal("edit"));
        document.querySelector('[data-admin-action="edit-company"]').addEventListener("click", () => openMasterDataModal("company"));
        document.querySelector('[data-admin-action="edit-locations"]').addEventListener("click", () => openMasterDataModal("location"));
        byId("productAdminForm").addEventListener("submit", saveAdminProduct);
        byId("toggleAdminProductState").addEventListener("click", () => {
            const active = byId("adminProductActive").checked;
            byId("adminProductActive").checked = !active;
            byId("productAdminForm").requestSubmit();
        });
        byId("addMasterDataButton").addEventListener("click", addMasterItem);
        byId("masterDataName").addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                addMasterItem();
            }
        });
        ["tableSearch", "tableCompanyFilter", "tableStatusFilter"].forEach(id => {
            byId(id).addEventListener(id === "tableSearch" ? "input" : "change", renderTable);
        });
    }

    initializeStorage();
    bindEvents();
    restoreSession();
    updateDateTime();
    window.setInterval(updateDateTime, 60000);
})();
