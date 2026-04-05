(() => {
    "use strict";

    const baseUrl = import.meta.env?.BASE_URL || "/";
    const SEARCH_API_ENDPOINT = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
    const LOOKUP_API_ENDPOINT = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";
    const HISTORY_STORAGE_KEY = "recipe-app-search-history";
    const FAVORITES_STORAGE_KEY = "recipe-app-favorites";
    const MAX_HISTORY_ITEMS = 8;
    const MAX_FAVORITES_ITEMS = 12;
    const LIVE_SEARCH_DELAY = 350;

    const form = document.querySelector("#recipeSearchForm");
    const searchInput = document.querySelector("#searchInput");
    const searchButton = document.querySelector("#searchBtn");
    const recipeContainer = document.querySelector("#recipeContainer");
    const detailsContent = document.querySelector("#recipeDetailsContent");
    const searchHistoryList = document.querySelector("#searchHistoryList");
    const searchStatus = document.querySelector("#searchStatus");
    const favoritesList = document.querySelector("#favoritesList");
    const favoritesCountBadge = document.querySelector("#favoritesCountBadge");
    const installAppButton = document.querySelector("#installAppBtn");
    const yearElement = document.querySelector("#year");

    if (
        !form ||
        !searchInput ||
        !searchButton ||
        !recipeContainer ||
        !detailsContent ||
        !searchHistoryList ||
        !searchStatus ||
        !favoritesList ||
        !favoritesCountBadge ||
        !installAppButton ||
        !yearElement
    ) {
        return;
    }

    const state = {
        meals: [],
        currentQuery: "",
        selectedMeal: null,
        activeController: null,
        debounceId: null,
        installPromptEvent: null,
        favorites: readFavorites()
    };

    yearElement.textContent = new Date().getFullYear();

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#39;"
            };

            return entities[character] || character;
        });
    }

    function normalizeQuery(value) {
        return String(value || "").trim().replace(/\s+/g, " ");
    }

    function readStoredArray(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function readHistory() {
        return readStoredArray(HISTORY_STORAGE_KEY)
            .map((item) => normalizeQuery(item))
            .filter(Boolean);
    }

    function readFavorites() {
        const uniqueIds = new Set();

        return readStoredArray(FAVORITES_STORAGE_KEY)
            .map((meal) => ({
                idMeal: String(meal.idMeal || ""),
                strMeal: normalizeQuery(meal.strMeal || ""),
                strMealThumb: String(meal.strMealThumb || ""),
                strArea: String(meal.strArea || ""),
                strCategory: String(meal.strCategory || ""),
                strInstructions: String(meal.strInstructions || "")
            }))
            .filter((meal) => {
                if (!meal.idMeal || !meal.strMeal || uniqueIds.has(meal.idMeal)) {
                    return false;
                }

                uniqueIds.add(meal.idMeal);
                return true;
            });
    }

    function saveHistoryItem(query) {
        const normalized = normalizeQuery(query);
        if (!normalized) {
            return;
        }

        const history = readHistory()
            .filter((item) => item.toLowerCase() !== normalized.toLowerCase());

        history.unshift(normalized);

        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
            renderHistory();
        } catch (error) {
            setStatus("Recipe loaded, but your browser blocked saving search history.", "error");
        }
    }

    function saveFavorites() {
        try {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favorites.slice(0, MAX_FAVORITES_ITEMS)));
            renderFavorites();
            return true;
        } catch (error) {
            setStatus("Recipe updated, but your browser blocked saving favorites.", "error");
            return false;
        }
    }

    function createMealSummary(meal) {
        return {
            idMeal: String(meal.idMeal || ""),
            strMeal: normalizeQuery(meal.strMeal || "Untitled recipe"),
            strMealThumb: String(meal.strMealThumb || ""),
            strArea: String(meal.strArea || ""),
            strCategory: String(meal.strCategory || ""),
            strInstructions: String(meal.strInstructions || "")
        };
    }

    function getMealTags(meal) {
        return [meal.strArea, meal.strCategory].filter(Boolean);
    }

    function isFavorite(mealId) {
        return state.favorites.some((meal) => meal.idMeal === String(mealId));
    }

    function setStatus(message, stateName = "idle") {
        searchStatus.textContent = message;
        searchStatus.dataset.state = stateName;
    }

    function updateRoute({ query = state.currentQuery, mealId = state.selectedMeal?.idMeal || "" } = {}) {
        const params = new URLSearchParams();

        if (query) {
            params.set("q", query);
        }

        if (mealId) {
            params.set("meal", mealId);
        }

        const search = params.toString();
        const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
    }

    function clearResults() {
        recipeContainer.innerHTML = `
            <div class="empty-state">
                <h2 id="resultsHeading">Search your favourite recipes</h2>
                <p>We will show matching meals here as soon as you start typing.</p>
            </div>
        `;
    }

    function clearDetails({ preserveRoute = false } = {}) {
        detailsContent.innerHTML = "";
        state.selectedMeal = null;

        if (!preserveRoute) {
            updateRoute({ mealId: "" });
        }
    }

    function truncateText(text, maxLength = 120) {
        const trimmed = normalizeQuery(text);
        if (trimmed.length <= maxLength) {
            return trimmed;
        }

        return `${trimmed.slice(0, maxLength).trim()}...`;
    }

    function renderHistory() {
        const history = readHistory();

        if (!history.length) {
            searchHistoryList.innerHTML = "";
            return;
        }

        searchHistoryList.innerHTML = history.map((item) => `
            <li>
                <button type="button" class="search-history-chip" data-history-query="${escapeHtml(item)}">
                    ${escapeHtml(item)}
                </button>
            </li>
        `).join("");
    }

    function renderFavorites() {
        const countLabel = `${state.favorites.length} saved`;
        favoritesCountBadge.textContent = countLabel;

        if (!state.favorites.length) {
            favoritesList.innerHTML = `
                <div class="empty-state compact-empty">
                    <h3>Build your cookbook</h3>
                    <p>Save recipes from search results to create a quick list you can reopen later.</p>
                </div>
            `;
            return;
        }

        favoritesList.innerHTML = state.favorites.map((meal) => `
            <article class="favorite-card">
                <img
                    class="favorite-card-img"
                    src="${escapeHtml(meal.strMealThumb || "favicon.svg")}"
                    alt="${escapeHtml(meal.strMeal)}"
                    loading="lazy"
                />
                <div class="favorite-card-body">
                    <div class="recipe-tags">
                        ${getMealTags(meal).map((tag) => `<span class="recipe-tag">${escapeHtml(tag)}</span>`).join("")}
                    </div>
                    <h3>${escapeHtml(meal.strMeal)}</h3>
                    <p>${escapeHtml(truncateText(meal.strInstructions || "Saved recipes can be reopened in a single click."))}</p>

                    <div class="favorite-card-actions">
                        <button type="button" class="primary-button" data-favorite-open-id="${escapeHtml(meal.idMeal)}">Open recipe</button>
                        <button
                            type="button"
                            class="utility-button is-active"
                            data-favorite-remove-id="${escapeHtml(meal.idMeal)}"
                            aria-pressed="true"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </article>
        `).join("");
    }

    function renderMeals(meals, query) {
        if (!meals.length) {
            recipeContainer.innerHTML = `
                <div class="empty-state">
                    <h2 id="resultsHeading">No results for "${escapeHtml(query)}"</h2>
                    <p>Try another meal name or keep it broader, like "pasta", "cake", or "beef".</p>
                </div>
            `;
            return;
        }

        recipeContainer.innerHTML = `
            <h2 id="resultsHeading">${meals.length} recipe${meals.length === 1 ? "" : "s"} found for "${escapeHtml(query)}"</h2>
            ${meals.map((meal) => {
                const saved = isFavorite(meal.idMeal);

                return `
                    <article class="recipe">
                        <img
                            class="recipe-img"
                            src="${escapeHtml(meal.strMealThumb)}"
                            alt="${escapeHtml(meal.strMeal)}"
                            loading="lazy"
                        />
                        <div class="recipe-body">
                            <div class="recipe-tags">
                                ${getMealTags(meal).map((tag) => `<span class="recipe-tag">${escapeHtml(tag)}</span>`).join("")}
                            </div>
                            <h3>${escapeHtml(meal.strMeal)}</h3>
                            <p>${escapeHtml(truncateText(meal.strInstructions || "Recipe details available."))}</p>

                            <div class="recipe-actions">
                                <button type="button" class="primary-button" data-meal-id="${escapeHtml(meal.idMeal)}">View details</button>
                                <button
                                    type="button"
                                    class="utility-button ${saved ? "is-active" : ""}"
                                    data-favorite-toggle-id="${escapeHtml(meal.idMeal)}"
                                    aria-pressed="${saved}"
                                >
                                    ${saved ? "Saved" : "Save"}
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            }).join("")}
        `;
    }

    function getIngredients(meal) {
        const items = [];

        for (let index = 1; index <= 20; index += 1) {
            const ingredient = normalizeQuery(meal[`strIngredient${index}`] || "");
            const measure = normalizeQuery(meal[`strMeasure${index}`] || "");

            if (!ingredient) {
                continue;
            }

            items.push(measure ? `${measure} ${ingredient}` : ingredient);
        }

        return items;
    }

    function renderDetails(meal, options = {}) {
        const { scrollIntoView = false } = options;
        const ingredients = getIngredients(meal);
        const links = [
            meal.strYoutube ? `<a class="detail-link primary" href="${escapeHtml(meal.strYoutube)}" target="_blank" rel="noopener">Watch on YouTube</a>` : "",
            meal.strSource ? `<a class="detail-link secondary" href="${escapeHtml(meal.strSource)}" target="_blank" rel="noopener">Open source recipe</a>` : ""
        ].filter(Boolean).join("");
        const saved = isFavorite(meal.idMeal);

        state.selectedMeal = meal;

        detailsContent.innerHTML = `
            <div class="details-grid">
                <div class="details-hero">
                    <img src="${escapeHtml(meal.strMealThumb)}" alt="${escapeHtml(meal.strMeal)}" />
                </div>

                <div class="details-copy">
                    <div class="details-title">
                        <h3>${escapeHtml(meal.strMeal)}</h3>
                        <div class="details-badges">
                            ${getMealTags(meal).map((tag) => `<span class="details-badge">${escapeHtml(tag)}</span>`).join("")}
                            ${saved ? `<span class="details-badge">Saved</span>` : ""}
                        </div>
                    </div>

                    <div class="details-links">
                        ${links || `<span class="details-badge">No external links available</span>`}
                    </div>

                    <div class="detail-toolbar">
                        <button
                            type="button"
                            class="utility-button ${saved ? "is-active" : ""}"
                            data-detail-favorite-id="${escapeHtml(meal.idMeal)}"
                            aria-pressed="${saved}"
                        >
                            ${saved ? "Saved to cookbook" : "Save to cookbook"}
                        </button>
                        <button type="button" class="utility-button" data-share-id="${escapeHtml(meal.idMeal)}">Share recipe</button>
                    </div>

                    <section class="details-section" aria-labelledby="ingredientsHeading">
                        <h4 id="ingredientsHeading">Ingredients</h4>
                        <ul class="ingredient-list">
                            ${(ingredients.length ? ingredients : ["Ingredients are not available for this meal."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                        </ul>
                    </section>

                    <section class="details-section" aria-labelledby="instructionsHeading">
                        <h4 id="instructionsHeading">Instructions</h4>
                        <p class="instructions">${escapeHtml(meal.strInstructions || "Instructions are not available for this meal.")}</p>
                    </section>
                </div>
            </div>
        `;

        updateRoute({
            query: state.currentQuery || meal.strMeal,
            mealId: meal.idMeal
        });

        if (scrollIntoView) {
            detailsContent.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function syncVisibleState() {
        renderFavorites();

        if (state.currentQuery) {
            renderMeals(state.meals, state.currentQuery);
        }

        if (state.selectedMeal) {
            renderDetails(state.selectedMeal);
        }
    }

    function toggleFavorite(meal) {
        const mealId = String(meal.idMeal);
        const mealIsSaved = isFavorite(mealId);

        if (mealIsSaved) {
            state.favorites = state.favorites.filter((item) => item.idMeal !== mealId);
        } else {
            state.favorites = [
                createMealSummary(meal),
                ...state.favorites.filter((item) => item.idMeal !== mealId)
            ].slice(0, MAX_FAVORITES_ITEMS);
        }

        if (!saveFavorites()) {
            return;
        }

        syncVisibleState();
        setStatus(
            mealIsSaved
                ? `"${meal.strMeal}" removed from your cookbook.`
                : `"${meal.strMeal}" saved to your cookbook.`,
            mealIsSaved ? "idle" : "success"
        );
    }

    async function fetchMealById(mealId) {
        const response = await fetch(`${LOOKUP_API_ENDPOINT}${encodeURIComponent(String(mealId))}`);

        if (!response.ok) {
            throw new Error(`Lookup failed with status ${response.status}`);
        }

        const data = await response.json();
        return Array.isArray(data.meals) ? data.meals[0] || null : null;
    }

    async function openMealById(mealId, options = {}) {
        const { scrollIntoView = true } = options;
        const existingMeal = state.meals.find((meal) => meal.idMeal === String(mealId));

        if (existingMeal) {
            renderDetails(existingMeal, { scrollIntoView });
            setStatus(`Recipe ready for "${existingMeal.strMeal}".`, "success");
            return;
        }

        setStatus("Loading the selected recipe...", "loading");

        try {
            const meal = await fetchMealById(mealId);

            if (!meal) {
                throw new Error("Recipe not found");
            }

            state.meals = [meal];
            state.currentQuery = meal.strMeal;
            searchInput.value = meal.strMeal;
            renderMeals(state.meals, meal.strMeal);
            renderDetails(meal, { scrollIntoView });
            setStatus(`Recipe ready for "${meal.strMeal}".`, "success");
        } catch (error) {
            setStatus("We could not load that recipe right now.", "error");
        }
    }

    async function shareMeal(meal) {
        updateRoute({
            query: state.currentQuery || meal.strMeal,
            mealId: meal.idMeal
        });

        const shareUrl = window.location.href;
        const shareData = {
            title: `${meal.strMeal} | Recipe App`,
            text: `Check out this recipe: ${meal.strMeal}`,
            url: shareUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                setStatus(`Share sheet opened for "${meal.strMeal}".`, "success");
                return;
            }

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareUrl);
                setStatus(`Recipe link copied for "${meal.strMeal}".`, "success");
                return;
            }

            throw new Error("Share unavailable");
        } catch (error) {
            if (error.name === "AbortError") {
                return;
            }

            setStatus(`Sharing is not available in this browser. Open this URL: ${shareUrl}`, "warning");
        }
    }

    async function searchMeals(query, options = {}) {
        const normalizedQuery = normalizeQuery(query);
        const { saveToHistory = true, selectedMealId = "" } = options;

        if (!normalizedQuery) {
            state.currentQuery = "";
            state.meals = [];

            if (state.activeController) {
                state.activeController.abort();
            }

            searchButton.disabled = false;
            clearResults();
            clearDetails({ preserveRoute: true });
            updateRoute({ query: "", mealId: "" });
            setStatus("Try a meal like \"Arrabiata\", \"Chicken\", or \"Soup\".");
            return;
        }

        if (state.activeController) {
            state.activeController.abort();
        }

        const controller = new AbortController();
        state.activeController = controller;
        state.currentQuery = normalizedQuery;
        searchButton.disabled = true;
        setStatus(`Searching recipes for "${normalizedQuery}"...`, "loading");

        try {
            const response = await fetch(`${SEARCH_API_ENDPOINT}${encodeURIComponent(normalizedQuery)}`, {
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Search failed with status ${response.status}`);
            }

            const data = await response.json();
            const meals = Array.isArray(data.meals) ? data.meals : [];

            if (controller.signal.aborted) {
                return;
            }

            state.meals = meals;
            renderMeals(meals, normalizedQuery);

            if (meals.length) {
                const selectedMeal = meals.find((meal) => meal.idMeal === String(selectedMealId)) || meals[0];
                renderDetails(selectedMeal);
                setStatus(`${meals.length} recipe${meals.length === 1 ? "" : "s"} ready for "${normalizedQuery}".`, "success");
            } else {
                clearDetails({ preserveRoute: true });
                updateRoute({ query: normalizedQuery, mealId: "" });
                setStatus(`No recipes matched "${normalizedQuery}".`, "warning");
            }

            if (saveToHistory) {
                saveHistoryItem(normalizedQuery);
            }
        } catch (error) {
            if (error.name === "AbortError") {
                return;
            }

            recipeContainer.innerHTML = `
                <div class="empty-state">
                    <h2 id="resultsHeading">We could not load recipes right now</h2>
                    <p>Please check your connection and try again in a moment.</p>
                </div>
            `;
            clearDetails({ preserveRoute: true });
            setStatus("Recipe search is temporarily unavailable. Please try again.", "error");
        } finally {
            if (state.activeController === controller) {
                state.activeController = null;
            }

            searchButton.disabled = false;
        }
    }

    function queueLiveSearch(value) {
        clearTimeout(state.debounceId);

        const normalized = normalizeQuery(value);
        if (!normalized) {
            searchMeals("", { saveToHistory: false });
            return;
        }

        state.debounceId = window.setTimeout(() => {
            searchMeals(normalized, { saveToHistory: false });
        }, LIVE_SEARCH_DELAY);
    }

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator) || !window.location.protocol.startsWith("http")) {
            return;
        }

        window.addEventListener("load", () => {
            navigator.serviceWorker.register(`${baseUrl}sw.js`).catch(() => {
                setStatus("The app loaded, but offline support could not be enabled in this browser.", "warning");
            });
        });
    }

    function setupInstallPrompt() {
        window.addEventListener("beforeinstallprompt", (event) => {
            event.preventDefault();
            state.installPromptEvent = event;
            installAppButton.hidden = false;
        });

        window.addEventListener("appinstalled", () => {
            installAppButton.hidden = true;
            state.installPromptEvent = null;
            setStatus("Recipe App was installed successfully.", "success");
        });
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearTimeout(state.debounceId);
        searchMeals(searchInput.value, { saveToHistory: true });
    });

    searchInput.addEventListener("input", (event) => {
        queueLiveSearch(event.target.value);
    });

    recipeContainer.addEventListener("click", (event) => {
        const favoriteTarget = event.target.closest("[data-favorite-toggle-id]");
        if (favoriteTarget) {
            const selectedMeal = state.meals.find((meal) => meal.idMeal === favoriteTarget.dataset.favoriteToggleId);
            if (selectedMeal) {
                toggleFavorite(selectedMeal);
            }
            return;
        }

        const detailTarget = event.target.closest("[data-meal-id]");
        if (!detailTarget) {
            return;
        }

        const selectedMeal = state.meals.find((meal) => meal.idMeal === detailTarget.dataset.mealId);
        if (!selectedMeal) {
            return;
        }

        renderDetails(selectedMeal, { scrollIntoView: true });
        setStatus(`Recipe ready for "${selectedMeal.strMeal}".`, "success");
    });

    detailsContent.addEventListener("click", (event) => {
        const favoriteTarget = event.target.closest("[data-detail-favorite-id]");
        if (favoriteTarget && state.selectedMeal) {
            toggleFavorite(state.selectedMeal);
            return;
        }

        const shareTarget = event.target.closest("[data-share-id]");
        if (shareTarget && state.selectedMeal) {
            shareMeal(state.selectedMeal);
        }
    });

    favoritesList.addEventListener("click", (event) => {
        const openTarget = event.target.closest("[data-favorite-open-id]");
        if (openTarget) {
            openMealById(openTarget.dataset.favoriteOpenId);
            return;
        }

        const removeTarget = event.target.closest("[data-favorite-remove-id]");
        if (!removeTarget) {
            return;
        }

        const selectedFavorite = state.favorites.find((meal) => meal.idMeal === removeTarget.dataset.favoriteRemoveId);
        if (selectedFavorite) {
            toggleFavorite(selectedFavorite);
        }
    });

    searchHistoryList.addEventListener("click", (event) => {
        const target = event.target.closest("[data-history-query]");
        if (!target) {
            return;
        }

        const query = target.dataset.historyQuery || "";
        searchInput.value = query;
        clearTimeout(state.debounceId);
        searchMeals(query, { saveToHistory: true });
    });

    installAppButton.addEventListener("click", async () => {
        if (!state.installPromptEvent) {
            return;
        }

        state.installPromptEvent.prompt();
        await state.installPromptEvent.userChoice;
        state.installPromptEvent = null;
        installAppButton.hidden = true;
    });

    renderHistory();
    renderFavorites();
    clearResults();
    setupInstallPrompt();
    registerServiceWorker();

    const initialParams = new URLSearchParams(window.location.search);
    const initialQuery = normalizeQuery(initialParams.get("q") || "");
    const initialMealId = normalizeQuery(initialParams.get("meal") || "");

    if (initialQuery) {
        searchInput.value = initialQuery;
        searchMeals(initialQuery, { saveToHistory: false, selectedMealId: initialMealId });
        return;
    }

    if (initialMealId) {
        openMealById(initialMealId, { scrollIntoView: false });
        return;
    }

    const initialHistory = readHistory();
    if (initialHistory.length) {
        searchInput.value = initialHistory[0];
        searchMeals(initialHistory[0], { saveToHistory: false });
    }
})();
