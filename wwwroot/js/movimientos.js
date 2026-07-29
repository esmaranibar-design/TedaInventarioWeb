(() => {
    "use strict";

    const store = window.TedaStore;
    const byId = id => document.getElementById(id);
    const currentUser = store.currentUser();
    const escapeHtml = value => String(value ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    const localDate = value => {
        const date = new Date(value);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    const displayDate = value => new Intl.DateTimeFormat("es-BO").format(new Date(value));
    const displayTime = value => new Intl.DateTimeFormat("es-BO", {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(new Date(value));

    let filteredMovements = [];

    function canView() {
        return store.hasPermission("verMovimientos", currentUser);
    }

    function populateFilters() {
        const movements = store.getMovements();
        const users = [...new Set(movements.map(item => item.userName))].sort();
        const actions = [...new Set(movements.map(item => item.actionType))].sort();
        byId("movementUserFilter").innerHTML = '<option value="">Todos los usuarios</option>' +
            users.map(user => `<option>${escapeHtml(user)}</option>`).join("");
        byId("movementActionFilter").innerHTML = '<option value="">Todas las acciones</option>' +
            actions.map(action => `<option>${escapeHtml(action)}</option>`).join("");

        const filters = store.getFilters().movements ?? {};
        ["movementDate", "movementDateFrom", "movementDateTo", "movementUserFilter", "movementActionFilter"]
            .forEach(id => byId(id).value = filters[id] ?? "");
    }

    function currentFilters() {
        return {
            movementDate: byId("movementDate").value,
            movementDateFrom: byId("movementDateFrom").value,
            movementDateTo: byId("movementDateTo").value,
            movementUserFilter: byId("movementUserFilter").value,
            movementActionFilter: byId("movementActionFilter").value
        };
    }

    function renderMovements() {
        const filters = currentFilters();
        const allFilters = store.getFilters();
        allFilters.movements = filters;
        store.saveFilters(allFilters);

        filteredMovements = store.getMovements()
            .filter(item => {
                const date = localDate(item.dateTime);
                return (!filters.movementDate || date === filters.movementDate) &&
                    (!filters.movementDateFrom || date >= filters.movementDateFrom) &&
                    (!filters.movementDateTo || date <= filters.movementDateTo) &&
                    (!filters.movementUserFilter || item.userName === filters.movementUserFilter) &&
                    (!filters.movementActionFilter || item.actionType === filters.movementActionFilter);
            })
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        byId("movementsTableBody").innerHTML = filteredMovements.map(item => `
            <tr>
                <td>${escapeHtml(displayDate(item.dateTime))}</td>
                <td>${escapeHtml(displayTime(item.dateTime))}</td>
                <td>${escapeHtml(item.userName)}</td>
                <td>${escapeHtml(item.role)}</td>
                <td><span class="badge text-bg-light">${escapeHtml(item.actionType)}</span></td>
                <td>${escapeHtml(item.module)}</td>
                <td class="description-cell">${escapeHtml(item.description)}</td>
                <td>${escapeHtml(item.product || "—")}</td>
                <td>${escapeHtml(item.company || "—")}</td>
                <td>${escapeHtml(item.previousValue || "—")}</td>
                <td>${escapeHtml(item.newValue || "—")}</td>
            </tr>`).join("");

        byId("emptyMovementsMessage").classList.toggle("d-none", filteredMovements.length > 0);
        byId("movementCount").textContent =
            `${filteredMovements.length} ${filteredMovements.length === 1 ? "registro" : "registros"}`;
    }

    function clearFilters() {
        ["movementDate", "movementDateFrom", "movementDateTo", "movementUserFilter", "movementActionFilter"]
            .forEach(id => byId(id).value = "");
        renderMovements();
    }

    function exportCsv() {
        if (!store.hasPermission("exportarDatos", currentUser)) return;
        const headers = ["Fecha", "Hora", "Usuario", "Rol", "Acción", "Módulo", "Descripción",
            "Producto", "Empresa", "Valor anterior", "Valor nuevo"];
        const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
        const rows = filteredMovements.map(item => [
            displayDate(item.dateTime), displayTime(item.dateTime), item.userName, item.role,
            item.actionType, item.module, item.description, item.product, item.company,
            item.previousValue, item.newValue
        ].map(quote).join(","));
        const blob = new Blob(["\ufeff" + [headers.map(quote).join(","), ...rows].join("\n")],
            { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `movimientos-${localDate(new Date())}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        store.addMovement({
            actionType: "Exportación",
            module: "Movimientos",
            description: `Se exportaron ${filteredMovements.length} movimientos.`
        });
    }

    if (!canView()) {
        byId("movementsAccessDenied").classList.remove("d-none");
    } else {
        byId("movementsContent").classList.remove("d-none");
        byId("exportMovementsButton").classList.toggle(
            "d-none", !store.hasPermission("exportarDatos", currentUser));
        populateFilters();
        renderMovements();
        byId("searchMovementsButton").addEventListener("click", renderMovements);
        byId("todayMovementsButton").addEventListener("click", () => {
            byId("movementDate").value = localDate(new Date());
            byId("movementDateFrom").value = "";
            byId("movementDateTo").value = "";
            renderMovements();
        });
        byId("clearMovementFiltersButton").addEventListener("click", clearFilters);
        byId("exportMovementsButton").addEventListener("click", exportCsv);
    }
})();
