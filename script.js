const searchBox = document.querySelector('.searchBox');
const searchBtn = document.querySelector('.searchBtn');
const recipeContainer = document.querySelector('.recipe-container');
const footerContent = document.querySelector('.footer-content');

function displayMessage(message) {
    updateRecipeContainer(`<h2>${message}</h2>`);
}

function updateRecipeContainer(content = ''){

    recipeContainer.innerHTML = content;
}

function getSearchHistory(){

    return JSON.parse(localStorage.getItem('Search-History')) || [];
}

function createRecipeElement(meal) {
    const recipeDiv = document.createElement('div');
    recipeDiv.classList.add('recipe');
    const link = meal.strSource || meal.strYoutube || '#';

    recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="recipe-img">
        <h3>${meal.strMeal}</h3>
        <p><strong>Area:</strong> ${meal.strArea}</p>
        <p><strong>Category:</strong> ${meal.strCategory}</p>
        <button class="view-recipe-btn">View Recipe</button>
    `;

    recipeDiv.querySelector('.view-recipe-btn').addEventListener('click',()=>{

        window.open(link,'_blank');
    });

    return recipeDiv;
}

const fetchRecipes = async (query) => {
    displayMessage('Fetching recipes...');
    try {
        const data = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
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
    localStorage.setItem('Search-History', JSON.stringify(history));
    renderSearchHistory();
}
function createHistoryListItem(item) {
    const li = document.createElement('li');
    li.textContent = item;
    addHistoryItemListener(li, item);
    return li;
}
function clearAndAppendChildren(container, children) {
    container.innerHTML = '';
    children.forEach(child => container.appendChild(child));
}

function renderSearchHistory() {
    const historyList = document.getElementById('searchHistoryList');
    const history = getSearchHistory();
    const items=history.map(item =>createHistoryListItem(item));
    clearAndAppendChildren(historyList, items); 
}
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('Dark-Mode', isDark);
    updateDarkModeButtonText(isDark);
}

function loadDarkModePreference() {
    const isDark = JSON.parse(localStorage.getItem('Dark-Mode'));
    if (isDark) {
        document.body.classList.add('dark-mode');
    }
    updateDarkModeButtonText(isDark);
}

function updateDarkModeButtonText(isDark) {
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
}

searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const searchInput = searchBox.value.trim();
    if (searchInput) {
        fetchRecipes(searchInput);
        saveToHistory(searchInput);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    renderSearchHistory();
    loadDarkModePreference();

    const yearSpan = document.getElementById("year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    const darkModeToggleBtn = document.getElementById('darkModeToggle');
    if (darkModeToggleBtn) {
        darkModeToggleBtn.addEventListener('click', toggleDarkMode);
    }
});




        


