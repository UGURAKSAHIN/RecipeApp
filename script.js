const API_ENDPOINT = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const HISTORY_STORAGE_KEY = "recipe-app-search-history";
const MAX_HISTORY_ITEMS = 8;
const LIVE_SEARCH_DELAY = 350;

const form = document.querySelector("#recipeSearchForm");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchBtn");
const recipeContainer = document.querySelector("#recipeContainer");
const detailsContent = document.querySelector("#recipeDetailsContent");
const searchHistoryList = document.querySelector("#searchHistoryList");
const searchStatus = document.querySelector("#searchStatus");
const yearElement = document.querySelector("#year");

const state = {
    meals: [],
    currentQuery: "",
    activeController: null,
    debounceId: null
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
    return value.trim().replace(/\s+/g, " ");
}

function readHistory() {
    try {
        const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
        return [];
    }
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

function setStatus(message, stateName = "idle") {
    searchStatus.textContent = message;
    searchStatus.dataset.state = stateName;
}

function clearResults() {
    recipeContainer.innerHTML = `
        <div class="empty-state">
            <h2 id="resultsHeading">Search your favourite recipes</h2>
            <p>We will show matching meals here as soon as you start typing.</p>
        </div>
    `;
}

function getMealTags(meal) {
    return [meal.strArea, meal.strCategory].filter(Boolean);
}

function truncateText(text, maxLength = 120) {
    const trimmed = normalizeQuery(text);
    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    return `${trimmed.slice(0, maxLength).trim()}...`;
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
        ${meals.map((meal) => `
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
                    <button type="button" data-meal-id="${escapeHtml(meal.idMeal)}">View details</button>
                </div>
            </article>
        `).join("")}
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

function renderDetails(meal) {
    const ingredients = getIngredients(meal);
    const links = [
        meal.strYoutube ? `<a class="detail-link primary" href="${escapeHtml(meal.strYoutube)}" target="_blank" rel="noopener">Watch on YouTube</a>` : "",
        meal.strSource ? `<a class="detail-link secondary" href="${escapeHtml(meal.strSource)}" target="_blank" rel="noopener">Open source recipe</a>` : ""
    ].filter(Boolean).join("");

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
                    </div>
                </div>

                <div class="details-links">
                    ${links || `<span class="details-badge">No external links available</span>`}
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
}

async function searchMeals(query, options = {}) {
    const normalizedQuery = normalizeQuery(query);
    const { saveToHistory = true } = options;

    if (!normalizedQuery) {
        state.currentQuery = "";
        state.meals = [];
        if (state.activeController) {
            state.activeController.abort();
        }
        searchButton.disabled = false;
        clearResults();
        detailsContent.innerHTML = "";
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
        const response = await fetch(`${API_ENDPOINT}${encodeURIComponent(normalizedQuery)}`, {
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
            renderDetails(meals[0]);
            setStatus(`${meals.length} recipe${meals.length === 1 ? "" : "s"} ready for "${normalizedQuery}".`);
        } else {
            detailsContent.innerHTML = "";
            setStatus(`No recipes matched "${normalizedQuery}".`, "error");
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
        detailsContent.innerHTML = "";
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

form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(state.debounceId);
    searchMeals(searchInput.value, { saveToHistory: true });
});

searchInput.addEventListener("input", (event) => {
    queueLiveSearch(event.target.value);
});

recipeContainer.addEventListener("click", (event) => {
    const target = event.target.closest("[data-meal-id]");
    if (!target) {
        return;
    }

    const selectedMeal = state.meals.find((meal) => meal.idMeal === target.dataset.mealId);
    if (!selectedMeal) {
        return;
    }

    renderDetails(selectedMeal);
    detailsContent.scrollIntoView({ behavior: "smooth", block: "start" });
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

renderHistory();
clearResults();

const initialHistory = readHistory();
if (initialHistory.length) {
    searchInput.value = initialHistory[0];
    searchMeals(initialHistory[0], { saveToHistory: false });
}
