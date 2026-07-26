/* ========================================== */
/* 1. ÉTAT DE L'APPLICATION & BDD LOCALSTORAGE*/
/* ========================================== */

// Structure des données de l'application
let appState = {
    profile: JSON.parse(localStorage.getItem('opti_profile')) || {
        age: 18,
        height: 175,
        weight: 70,
        goal: 'gain' // 'gain', 'maintain', 'loss'
    },
    foodBdd: JSON.parse(localStorage.getItem('opti_foods')) || [],
    recipeBdd: JSON.parse(localStorage.getItem('opti_recipes')) || [],
    dailyLog: JSON.parse(localStorage.getItem('opti_dailyLog')) || [],
    itemUsage: JSON.parse(localStorage.getItem('opti_usage')) || {} // Pour le tri par fréquence
};

// Index / ID pour les éléments à supprimer dans la modale
let pendingDeleteType = null;
let pendingDeleteId = null;

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

// Navigation entre les onglets principaux (Journal / BDD / Profil)
function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (element) element.classList.add('active');
}

// Sous-onglets de la Base de Données (Aliments / Plats)
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

// Gestion des Modales / Pop-ups
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
/* 3. MOTEUR DE CALCUL SCIENTIFIQUE           */
/* ========================================== */

// Formule de Mifflin-St Jeor pour le Métabolisme de Base
function calculateTargets() {
    const { age, height, weight, goal } = appState.profile;
    
    // BMR (Homme) = (10 x poids) + (6.25 x taille) - (5 x âge) + 5
    let bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    
    // Estimation d'un niveau d'activité moyen (NAP ~ 1.55)
    let tdee = bmr * 1.55; 

    // Ajustement selon l'objectif
    let targetCal = tdee;
    if (goal === 'gain') targetCal += 300;      // Surplus de +300 kcal
    else if (goal === 'loss') targetCal -= 400; // Déficit de -400 kcal

    // Répartition recommandée des Macros
    let proteinTarget = Math.round(weight * 2.0); // 2.0g / kg de poids
    let fatTarget = Math.round(weight * 1.0);     // 1.0g / kg de poids
    let fiberTarget = 30;                         // Objectif standard 30g
    let sugarMax = Math.round((targetCal * 0.08) / 4); // < 8% du total en sucres

    // Le reste des calories attribué aux Glucides
    let proteinCal = proteinTarget * 4;
    let fatCal = fatTarget * 9;
    let remainingCal = targetCal - (proteinCal + fatCal);
    let carbTarget = Math.max(Math.round(remainingCal / 4), 50);

    // Enregistrement des objectifs calculés
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
/* 4. DASHBOARD & SUIVI DES MACROS            */
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

    // Mettre à jour les chiffres affichés
    document.getElementById('calAbsorbed').textContent = Math.round(totals.kcal);
    document.getElementById('val-protein').textContent = Math.round(totals.protein);
    document.getElementById('val-carb').textContent = Math.round(totals.carb);
    document.getElementById('val-sugar').textContent = Math.round(totals.sugar);
    document.getElementById('val-fat').textContent = Math.round(totals.fat);
    document.getElementById('val-fiber').textContent = Math.round(totals.fiber);

    // Mettre à jour l'avancement des 5 roues (pourcentage)
    const t = appState.targets;
    updateRing('ring-protein', totals.protein, t.protein);
    updateRing('ring-carb', totals.carb, t.carb);
    updateRing('ring-sugar', totals.sugar, t.sugar);
    updateRing('ring-fat', totals.fat, t.fat);
    updateRing('ring-fiber', totals.fiber, t.fiber);

    // Afficher la liste des consommations du jour
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
        list.innerHTML = '<li style="color:var(--text-secondary); text-align:center; padding:15px;">Aucun aliment enregistré aujourd\'hui</li>';
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
/* 5. GESTION DE LA BASE DE DONNÉES           */
/* ========================================== */

// Enregistrer un nouvel aliment (pour 100g)
document.getElementById('addFoodForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newFood = {
        id: Date.now(),
        name: document.getElementById('foodName').value,
        kcal: parseFloat(document.getElementById('foodKcal').value),
        protein: parseFloat(document.getElementById('foodProtein').value),
        carb: parseFloat(document.getElementById('foodCarbs').value),
        sugar: parseFloat(document.getElementById('foodSugar').value),
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
        list.innerHTML = '<li style="color:var(--text-secondary); text-align:center; padding:15px;">Aucun aliment en BDD</li>';
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
        list.innerHTML = '<li style="color:var(--text-secondary); text-align:center; padding:15px;">Aucun plat composé enregistré</li>';
        return;
    }

    appState.recipeBdd.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <div>
                <div class="item-title">${item.name} (Plat)</div>
                <div class="item-sub">100g = ${item.kcal} kcal | P: ${item.protein}g | G: ${item.carb}g | L: ${item.fat}g</div>
            </div>
            <button class="delete-btn" onclick="requestDelete('recipe', ${index})">&times;</button>
        `;
        list.appendChild(li);
    });
}

/* ========================================== */
/* 6. RECHERCHE & AJOUT DE CONSOMMATION       */
/* ========================================== */

let selectedItemForAdd = null;

function populateMealSearchList(query = '') {
    const resultsContainer = document.getElementById('searchMealResults');
    resultsContainer.innerHTML = '';

    // Combiner Aliments et Plats
    let allItems = [
        ...appState.foodBdd.map(f => ({ ...f, type: 'food' })),
        ...appState.recipeBdd.map(r => ({ ...r, type: 'recipe' }))
    ];

    // Trier par fréquence d'utilisation
    allItems.sort((a, b) => {
        let countA = appState.itemUsage[a.name] || 0;
        let countB = appState.itemUsage[b.name] || 0;
        return countB - countA;
    });

    // Filtrer selon la recherche
    if (query) {
        allItems = allItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
    }

    if (allItems.length === 0) {
        resultsContainer.innerHTML = '<li style="color:var(--text-secondary); padding:10px;">Aucun résultat. Ajoutez des aliments dans la BDD.</li>';
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

// Validation de l'ajout au Journal quotidien
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

    // Mettre à jour la fréquence d'utilisation
    appState.itemUsage[selectedItemForAdd.name] = (appState.itemUsage[selectedItemForAdd.name] || 0) + 1;
    saveState('opti_usage', appState.itemUsage);

    renderDashboard();
    closeModal('modalAddMeal');

    // Réinitialiser la sélection
    selectedItemForAdd = null;
    document.getElementById('portionSelector').classList.add('hidden');
});

// Écouteur de recherche rapide
document.getElementById('searchMealInput').addEventListener('input', (e) => {
    populateMealSearchList(e.target.value);
});

/* ========================================== */
/* 7. PROFIL ET SAUVEGARDES                   */
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

/* ========================================== */
/* 8. POP-UP DE SUPPRESSION & HELPERS        */
/* ========================================== */

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
}

function saveState(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}
