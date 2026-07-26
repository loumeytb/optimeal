/* ========================================== */
/* 1. ÉTAT DE L'APPLICATION & STORAGE         */
/* ========================================== */

let appState = {
    profile: JSON.parse(localStorage.getItem('opti_profile')) || {
        age: 18,
        height: 175,
        weight: 70,
        goal: 'gain'
    },
    foodBdd: JSON.parse(localStorage.getItem('opti_foods')) || [],
    recipeBdd: JSON.parse(localStorage.getItem('opti_recipes')) || [],
    dailyLog: JSON.parse(localStorage.getItem('opti_dailyLog')) || [],
    itemUsage: JSON.parse(localStorage.getItem('opti_usage')) || {}
};

let pendingDeleteType = null;
let pendingDeleteId = null;
let selectedItemForAdd = null;
let currentRecipeIngredients = [];

/* ========================================== */
/* 2. INITIALISATION & NAVIGATION             */
/* ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadProfileValues();
    calculateTargets();
    renderDashboard();
    renderFoodList();
    renderRecipeList();
    setupEventListeners();
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (element) element.classList.add('active');
}

function switchBddSubtab(subtab) {
    const btnAliments = document.getElementById('subtab-aliments-btn');
    const btnPlats = document.getElementById('subtab-plats-btn');
    const contentAliments = document.getElementById('subtab-aliments');
    const contentPlats = document.getElementById('subtab-plats');
    const btnAddFood = document.getElementById('btnAddFood');
    const btnAddRecipe = document.getElementById('btnAddRecipe');

    if (subtab === 'aliments') {
        btnAliments.classList.add('active');
        btnPlats.classList.remove('active');
        contentAliments.classList.add('active');
        contentPlats.classList.remove('active');
        btnAddFood.classList.remove('hidden');
        btnAddRecipe.classList.add('hidden');
    } else {
        btnPlats.classList.add('active');
        btnAliments.classList.remove('active');
        contentPlats.classList.add('active');
        contentAliments.classList.remove('active');
        btnAddRecipe.classList.remove('hidden');
        btnAddFood.classList.add('hidden');
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'modalAddMeal') {
        populateMealSearchList();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/* ========================================== */
/* 3. MOTEUR SCIENTIFIQUE (BMR & TDEE)        */
/* ========================================== */

function calculateTargets() {
    const { age, height, weight, goal } = appState.profile;
    
    // BMR (Homme) = (10 x kg) + (6.25 x cm) - (5 x ans) + 5
    let bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    let tdee = bmr * 1.55; 

    let targetCal = tdee;
    if (goal === 'gain') targetCal += 300;
    else if (goal === 'loss') targetCal -= 400;

    let proteinTarget = Math.round(weight * 2.0);
    let fatTarget = Math.round(weight * 1.0);
    let fiberTarget = 30;
    let sugarMax = Math.round((targetCal * 0.08) / 4);

    let proteinCal = proteinTarget * 4;
    let fatCal = fatTarget * 9;
    let remainingCal = targetCal - (proteinCal + fatCal);
    let carbTarget = Math.max(Math.round(remainingCal / 4), 50);

    appState.targets = {
        kcal: Math.round(targetCal),
        protein: proteinTarget,
        carb: carbTarget,
        sugar: sugarMax,
        fat: fatTarget,
        fiber: fiberTarget
    };

    updateTargetUI();
}

function updateTargetUI() {
    const t = appState.targets;
    document.getElementById('calTarget').textContent = t.kcal;
    document.getElementById('target-protein').textContent = t.protein;
    document.getElementById('target-carb').textContent = t.carb;
    document.getElementById('target-sugar').textContent = t.sugar;
    document.getElementById('target-fat').textContent = t.fat;
    document.getElementById('target-fiber').textContent = t.fiber;
}

/* ========================================== */
/* 4. DASHBOARD & ROUES MACROS                */
/* ========================================== */

function renderDashboard() {
    let totals = { kcal: 0, protein: 0, carb: 0, sugar: 0, fat: 0, fiber: 0 };

    appState.dailyLog.forEach(item => {
        totals.kcal += item.kcal;
        totals.protein += item.protein;
        totals.carb += item.carb;
        totals.sugar += item.sugar;
        totals.fat += item.fat;
        totals.fiber += item.fiber;
    });

    document.getElementById('calAbsorbed').textContent = Math.round(totals.kcal);
    document.getElementById('val-protein').textContent = Math.round(totals.protein);
    document.getElementById('val-carb').textContent = Math.round(totals.carb);
    document.getElementById('val-sugar').textContent = Math.round(totals.sugar);
    document.getElementById('val-fat').textContent = Math.round(totals.fat);
    document.getElementById('val-fiber').textContent = Math.round(totals.fiber);

    const t = appState.targets;
    updateRing('ring-protein', totals.protein, t.protein);
    updateRing('ring-carb', totals.carb, t.carb);
    updateRing('ring-sugar', totals.sugar, t.sugar);
    updateRing('ring-fat', totals.fat, t.fat);
    updateRing('ring-fiber', totals.fiber, t.fiber);

    renderTodayList();
}

function updateRing(ringId, current, target) {
    const percent = Math.min(Math.round((current / target) * 100), 100);
    const ring = document.getElementById(ringId);
    if (ring) {
        ring.setAttribute('stroke-dasharray', `${percent}, 100`);
    }
}

function renderTodayList() {
    const list = document.getElementById('todayMealList');
    list.innerHTML = '';

    if (appState.dailyLog.length === 0) {
        list.innerHTML = '<li style="color:var(--text-sub); text-align:center; padding:15px; font-size:0.85rem;">Aucun aliment enregistré aujourd\'hui</li>';
        return;
    }

    appState.dailyLog.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <div>
                <div class="item-title">${item.name} (${item.amount}g)</div>
                <div class="item-sub">${Math.round(item.kcal)} kcal | P: ${Math.round(item.protein)}g | G: ${Math.round(item.carb)}g | L: ${Math.round(item.fat)}g</div>
            </div>
            <button class="delete-btn" onclick="requestDelete('log', ${index})">&times;</button>
        `;
        list.appendChild(li);
    });
}

/* ========================================== */
/* 5. BASE DE DONNÉES ALIMENTS & PLATS        */
/* ========================================== */

document.getElementById('addFoodForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newFood = {
        id: Date.now(),
        name: document.getElementById('foodName').value,
        kcal: parseFloat(document.getElementById('foodKcal').value),
        protein: parseFloat(document.getElementById('foodProtein').value),
        carb: parseFloat(document.getElementById('foodCarbs').value),
        sugar: parseFloat(document.getElementById('foodSugar').value) || 0,
        fat: parseFloat(document.getElementById('foodFat').value),
        fiber: parseFloat(document.getElementById('foodFiber').value) || 0
    };

    appState.foodBdd.push(newFood);
    saveState('opti_foods', appState.foodBdd);
    
    renderFoodList();
    closeModal('modalAddFood');
    e.target.reset();
});

function renderFoodList() {
    const list = document.getElementById('foodBddList');
    list.innerHTML = '';

    if (appState.foodBdd.length === 0) {
        list.innerHTML = '<li style="color:var(--text-sub); text-align:center; padding:15px; font-size:0.85rem;">Aucun aliment en BDD</li>';
        return;
    }

    appState.foodBdd.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <div>
                <div class="item-title">${item.name}</div>
                <div class="item-sub">100g = ${item.kcal} kcal | P: ${item.protein}g | G: ${item.carb}g | L: ${item.fat}g</div>
            </div>
            <button class="delete-btn" onclick="requestDelete('food', ${index})">&times;</button>
        `;
        list.appendChild(li);
    });
}

function renderRecipeList() {
    const list = document.getElementById('recipeBddList');
    list.innerHTML = '';

    if (appState.recipeBdd.length === 0) {
        list.innerHTML = '<li style="color:var(--text-sub); text-align:center; padding:15px; font-size:0.85rem;">Aucun plat composé enregistré</li>';
        return;
    }

    appState.recipeBdd.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <div>
                <div class="item-title">${item.name} 🥗</div>
                <div class="item-sub">100g = ${item.kcal} kcal | P: ${item.protein}g | G: ${item.carb}g | L: ${item.fat}g</div>
            </div>
            <button class="delete-btn" onclick="requestDelete('recipe', ${index})">&times;</button>
        `;
        list.appendChild(li);
    });
}

/* ========================================== */
/* 6. CRÉATION DE PLATS COMPOSÉS (RECETTES)   */
/* ========================================== */

function populateRecipeFoodSelect() {
    const select = document.getElementById('recipeSelectFood');
    select.innerHTML = '';

    if (appState.foodBdd.length === 0) {
        select.innerHTML = '<option value="">Aucun aliment en BDD</option>';
        return;
    }

    appState.foodBdd.forEach((item, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = `${item.name} (${item.kcal} kcal / 100g)`;
        select.appendChild(opt);
    });
}

document.getElementById('btnAddIngredientToRecipe').addEventListener('click', () => {
    const select = document.getElementById('recipeSelectFood');
    const foodIndex = select.value;
    const amount = parseFloat(document.getElementById('recipeFoodAmount').value);

    if (foodIndex === "" || isNaN(amount) || amount <= 0) {
        alert("Sélectionnez un aliment et entrez une quantité valide.");
        return;
    }

    const food = appState.foodBdd[foodIndex];
    
    currentRecipeIngredients.push({
        name: food.name,
        amount: amount,
        kcal: food.kcal,
        protein: food.protein,
        carb: food.carb,
        sugar: food.sugar,
        fat: food.fat,
        fiber: food.fiber
    });

    document.getElementById('recipeFoodAmount').value = '';
    renderRecipeIngredients();
});

function renderRecipeIngredients() {
    const list = document.getElementById('recipeIngredientsList');
    const summary = document.getElementById('recipeSummary');
    list.innerHTML = '';

    if (currentRecipeIngredients.length === 0) {
        list.innerHTML = '<li style="color:var(--text-sub); font-size:0.85rem; text-align:center; padding:10px;">Aucun ingrédient ajouté pour l\'instant.</li>';
        summary.innerHTML = 'Poids total : <b>0g</b><br>Pour 100g : <b>0 kcal</b> | P: <b>0g</b> | G: <b>0g</b> | L: <b>0g</b>';
        return;
    }

    let totalWeight = 0;
    let totals = { kcal: 0, protein: 0, carb: 0, sugar: 0, fat: 0, fiber: 0 };

    currentRecipeIngredients.forEach((ing, index) => {
        const ratio = ing.amount / 100;
        totalWeight += ing.amount;
        
        totals.kcal += ing.kcal * ratio;
        totals.protein += ing.protein * ratio;
        totals.carb += ing.carb * ratio;
        totals.sugar += ing.sugar * ratio;
        totals.fat += ing.fat * ratio;
        totals.fiber += ing.fiber * ratio;

        const li = document.createElement('li');
        li.className = 'item-card';
        li.style.padding = '8px 12px';
        li.innerHTML = `
            <div>
                <div class="item-title" style="font-size:0.85rem;">${ing.name}</div>
                <div class="item-sub">${ing.amount}g</div>
            </div>
            <button class="delete-btn" onclick="removeRecipeIngredient(${index})">&times;</button>
        `;
        list.appendChild(li);
    });

    const per100gRatio = 100 / totalWeight;
    const per100g = {
        kcal: Math.round(totals.kcal * per100gRatio),
        protein: Math.round((totals.protein * per100gRatio) * 10) / 10,
        carb: Math.round((totals.carb * per100gRatio) * 10) / 10,
        sugar: Math.round((totals.sugar * per100gRatio) * 10) / 10,
        fat: Math.round((totals.fat * per100gRatio) * 10) / 10,
        fiber: Math.round((totals.fiber * per100gRatio) * 10) / 10
    };

    summary.innerHTML = `
        Poids total du plat : <b>${Math.round(totalWeight)}g</b><br>
        Pour 100g : <b>${per100g.kcal} kcal</b> | P: <b>${per100g.protein}g</b> | G: <b>${per100g.carb}g</b> | L: <b>${per100g.fat}g</b>
    `;

    window.computedRecipePer100g = per100g;
}

function removeRecipeIngredient(index) {
    currentRecipeIngredients.splice(index, 1);
    renderRecipeIngredients();
}

document.getElementById('btnSaveRecipe').addEventListener('click', () => {
    const name = document.getElementById('recipeName').value.trim();
    
    if (!name) {
        alert("Veuillez donner un nom à votre plat.");
        return;
    }

    if (currentRecipeIngredients.length === 0) {
        alert("Ajoutez au moins un ingrédient.");
        return;
    }

    const recipe = {
        id: Date.now(),
        name: name,
        ...window.computedRecipePer100g
    };

    appState.recipeBdd.push(recipe);
    saveState('opti_recipes', appState.recipeBdd);

    renderRecipeList();
    closeModal('modalAddRecipe');
});

/* ========================================== */
/* 7. RECHERCHE & AJOUT DE CONSOMMATION       */
/* ========================================== */

function populateMealSearchList(query = '') {
    const resultsContainer = document.getElementById('searchMealResults');
    resultsContainer.innerHTML = '';

    let allItems = [
        ...appState.foodBdd.map(f => ({ ...f, type: 'food' })),
        ...appState.recipeBdd.map(r => ({ ...r, type: 'recipe' }))
    ];

    allItems.sort((a, b) => (appState.itemUsage[b.name] || 0) - (appState.itemUsage[a.name] || 0));

    if (query) {
        allItems = allItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
    }

    if (allItems.length === 0) {
        resultsContainer.innerHTML = '<li style="color:var(--text-sub); padding:10px; font-size:0.85rem;">Aucun résultat trouvé.</li>';
        return;
    }

    allItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.style.cursor = 'pointer';
        li.innerHTML = `
            <div>
                <div class="item-title">${item.name} ${item.type === 'recipe' ? '🥗' : ''}</div>
                <div class="item-sub">100g = ${item.kcal} kcal | P:${item.protein}g G:${item.carb}g L:${item.fat}g</div>
            </div>
        `;
        li.onclick = () => selectItemToAdd(item);
        resultsContainer.appendChild(li);
    });
}

function selectItemToAdd(item) {
    selectedItemForAdd = item;
    document.getElementById('selectedItemName').textContent = item.name;
    document.getElementById('portionSelector').classList.remove('hidden');
}

document.getElementById('btnConfirmAddMeal').addEventListener('click', () => {
    if (!selectedItemForAdd) return;

    const amount = parseFloat(document.getElementById('consumedAmount').value) || 100;
    const ratio = amount / 100;

    const loggedItem = {
        name: selectedItemForAdd.name,
        amount: amount,
        kcal: selectedItemForAdd.kcal * ratio,
        protein: selectedItemForAdd.protein * ratio,
        carb: selectedItemForAdd.carb * ratio,
        sugar: selectedItemForAdd.sugar * ratio,
        fat: selectedItemForAdd.fat * ratio,
        fiber: selectedItemForAdd.fiber * ratio
    };

    appState.dailyLog.push(loggedItem);
    saveState('opti_dailyLog', appState.dailyLog);

    appState.itemUsage[selectedItemForAdd.name] = (appState.itemUsage[selectedItemForAdd.name] || 0) + 1;
    saveState('opti_usage', appState.itemUsage);

    renderDashboard();
    closeModal('modalAddMeal');

    selectedItemForAdd = null;
    document.getElementById('portionSelector').classList.add('hidden');
});

document.getElementById('searchMealInput').addEventListener('input', (e) => {
    populateMealSearchList(e.target.value);
});

/* ========================================== */
/* 8. PROFIL, SUPPRESSIONS & EVENT LISTENERS  */
/* ========================================== */

function loadProfileValues() {
    document.getElementById('profAge').value = appState.profile.age;
    document.getElementById('profHeight').value = appState.profile.height;
    document.getElementById('profWeight').value = appState.profile.weight;
    document.getElementById('profGoal').value = appState.profile.goal;
}

document.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    appState.profile = {
        age: parseInt(document.getElementById('profAge').value),
        height: parseInt(document.getElementById('profHeight').value),
        weight: parseFloat(document.getElementById('profWeight').value),
        goal: document.getElementById('profGoal').value
    };

    saveState('opti_profile', appState.profile);
    calculateTargets();
    renderDashboard();
    alert('Profil et objectifs mis à jour !');
});

function requestDelete(type, index) {
    pendingDeleteType = type;
    pendingDeleteId = index;
    openModal('modalConfirmDelete');
}

document.getElementById('btnConfirmDeleteAction').addEventListener('click', () => {
    if (pendingDeleteType === 'log') {
        appState.dailyLog.splice(pendingDeleteId, 1);
        saveState('opti_dailyLog', appState.dailyLog);
        renderDashboard();
    } else if (pendingDeleteType === 'food') {
        appState.foodBdd.splice(pendingDeleteId, 1);
        saveState('opti_foods', appState.foodBdd);
        renderFoodList();
    } else if (pendingDeleteType === 'recipe') {
        appState.recipeBdd.splice(pendingDeleteId, 1);
        saveState('opti_recipes', appState.recipeBdd);
        renderRecipeList();
    }

    closeModal('modalConfirmDelete');
});

function setupEventListeners() {
    document.getElementById('btnOpenAddMeal').addEventListener('click', () => {
        openModal('modalAddMeal');
    });

    document.getElementById('btnAddRecipe').addEventListener('click', () => {
        currentRecipeIngredients = [];
        document.getElementById('recipeName').value = '';
        document.getElementById('recipeFoodAmount').value = '';
        populateRecipeFoodSelect();
        renderRecipeIngredients();
        openModal('modalAddRecipe');
    });
}

function saveState(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}
