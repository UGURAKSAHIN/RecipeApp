const searchBox = document.querySelector('.searchBox');
const searchForm = document.querySelector('#recipeSearchForm');
const recipeContainer = document.querySelector('.recipe-container');
const historyList = document.querySelector('#searchHistoryList');

function displayMessage(message) {
    updateRecipeContainer(`<h2>${message}</h2>`);
}

function updateRecipeContainer(content = '') {
    recipeContainer.innerHTML = content;
}

function getSearchHistory() {
    return JSON.parse(localStorage.getItem('Search-History')) || [];
}

function createRecipeElement(meal) {
    const recipeDiv = document.createElement('div');
    recipeDiv.classList.add('recipe');
    const link = meal.strSource || meal.strYoutube || '#';
    const hasLink = link !== '#';

    recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="recipe-img">
        <h3>${meal.strMeal}</h3>
        <p><strong>Area:</strong> ${meal.strArea}</p>
        <p><strong>Category:</strong> ${meal.strCategory}</p>
        <button class="view-recipe-btn" type="button" ${hasLink ? '' : 'disabled'}>
            ${hasLink ? 'View Recipe' : 'Recipe Link Unavailable'}
        </button>
    `;

    recipeDiv.querySelector('.view-recipe-btn').addEventListener('click', () => {
        if (!hasLink) {
            return;
        }

        window.open(link, '_blank', 'noopener');
    });

    return recipeDiv;
}

const fetchRecipes = async (query) => {
    displayMessage('Fetching recipes...');

    try {
        const data = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
        const response = await data.json();

        updateRecipeContainer();

        if (!response.meals) {
            displayMessage('No recipes found. Try another search!');
            return;
        }

        response.meals.forEach(meal => {
            const recipeElement = createRecipeElement(meal);
            recipeContainer.appendChild(recipeElement);
        });
    } catch (error) {
        displayMessage('Error fetching recipes. Please try again later.');
    }
};

function saveToHistory(query) {
    let history = getSearchHistory();

    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    history.unshift(query);
    history = history.slice(0, 8);

    localStorage.setItem('Search-History', JSON.stringify(history));
    renderSearchHistory();
}

function addHistoryItemListener(historyItem, query) {
    historyItem.addEventListener('click', () => {
        searchBox.value = query;
        fetchRecipes(query);
        saveToHistory(query);
    });
}

function renderSearchHistory() {
    const history = getSearchHistory();

    historyList.innerHTML = '';
    history.forEach(item => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-history-chip';
        button.textContent = item;
        addHistoryItemListener(button, item);
        li.appendChild(button);
        historyList.appendChild(li);
    });
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchInput = searchBox.value.trim();

    if (searchInput) {
        fetchRecipes(searchInput);
        saveToHistory(searchInput);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    renderSearchHistory();

    const yearSpan = document.getElementById("year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
});
