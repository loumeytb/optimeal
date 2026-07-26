// ==========================================
// 1. ÉTAT DE L'APPLICATION (STORAGE)
// ==========================================
let state = {
    goals: { calories: 2000, protein: 150, carb: 250, sugar: 50, fat: 70, fiber: 30 },
    profile: { weight: '', height: '', age: '', gender: 'male', activity: '1.15', goal: 'maintain', targetWeight: '', targetDays: '' },
    foods: [],
    recipes: [],
    logs: [] // Liste des consommations de la journée
};

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderAll();
    setupEventListeners();
});

function loadData() {
    const saved = localStorage.getItem('nutrition_data');
    if (saved) {
        state = JSON.parse(saved);
    }
}

function saveData() {
    localStorage.setItem('nutrition_data', JSON.stringify(state));
    renderAll();
}

// ==========================================
// 2. GESTION DES NAVIGATION / ONGLETS
// ==========================================
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');
}

function switchSubTab(subTabName) {
    document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bdd-content').forEach(c => c.classList.remove('active'));

    if (subTabName === 'aliments') {
        document.querySelectorAll('.subnav-btn')[0].classList.add('active');
        document.getElementById('bdd-aliments').classList.add('active');
    } else {
        document.querySelectorAll('.subnav-btn')[1].classList.add('active');
        document.getElementById('bdd-plats').classList.add('active');
    }
}

function openModal(modalId) {
    if (modalId === 'modal-log') populateLogSelect();
    if (modalId === 'modal-recipe') prepareRecipeForm();
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ==========================================
// 3. LOGIQUE & CALCULS
// ==========================================

// Calcul du Total Journalier
function calculateDailyTotals() {
    let totals = { calories: 0, protein: 0, carb: 0, sugar: 0, fat: 0, fiber: 0 };

    state.logs.forEach(log => {
        let item = state.foods.find(f => f.id === log.itemId) || state.recipes.find(r => r.id === log.itemId);
        if (item) {
            let ratio = log.amount / 100;
            totals.calories += (item.calories || 0) * ratio;
            totals.protein += (item.protein || 0) * ratio;
            totals.carb += (item.carb || 0) * ratio;
            totals.sugar += (item.sugar || 0) * ratio;
            totals.fat += (item.fat || 0) * ratio;
            totals.fiber += (item.fiber || 0) * ratio;
        }
    });

    return totals;
}

// Rendu Graphique (Comptoirs et Roues)
function renderDashboard() {
    const totals = calculateDailyTotals();

    // Affichage des Calories
    document.getElementById('calories-val').textContent = Math.round(totals.calories);
    document.getElementById('calories-goal').textContent = Math.round(state.goals.calories);

    // Mettre à jour les 5 roues
    updateMacroCard('protein', totals.protein, state.goals.protein);
    updateMacroCard('carb', totals.carb, state.goals.carb);
    updateMacroCard('sugar', totals.sugar, state.goals.sugar);
    updateMacroCard('fat', totals.fat, state.goals.fat);
    updateMacroCard('fiber', totals.fiber, state.goals.fiber);

    // Rendu de la liste du journal
    const logList = document.getElementById('log-list');
    logList.innerHTML = '';
    state.logs.forEach((log, index) => {
        let item = state.foods.find(f => f.id === log.itemId) || state.recipes.find(r => r.id === log.itemId);
        if (!item) return;

        let ratio = log.amount / 100;
        let cals = Math.round(item.calories * ratio);

        let li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <div>
                <div class="item-title">${item.name}</div>
                <div class="item-sub">${log.amount}g/ml • ${cals} kcal</div>
            </div>
            <button class="delete-btn" onclick="deleteLog(${index})">&times;</button>
        `;
        logList.appendChild(li);
    });
}

function updateMacroCard(type, value, goal) {
    document.getElementById(`val-${type}`).textContent = Math.round(value);
    document.getElementById(`goal-${type}`).textContent = Math.round(goal);

    let percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
    let circle = document.getElementById(`circle-${type}`);
    if (circle) {
        circle.setAttribute('stroke-dasharray', `${percent}, 100`);
    }
}

// Rendu BDD (Aliments & Plats)
function renderBDD() {
    const foodList = document.getElementById('food-list');
    foodList.innerHTML = '';
    state.foods.forEach(food => {
        let li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <div>
                <div class="item-title">${food.name}</div>
                <div class="item-sub">100g • ${food.calories} kcal (P: ${food.protein}g | G: ${food.carb}g | L: ${food.fat}g)</div>
            </div>
            <button class="delete-btn" onclick="deleteFood('${food.id}')">&times;</button>
        `;
        foodList.appendChild(li);
    });

    const recipeList = document.getElementById('recipe-list');
    recipeList.innerHTML = '';
    state.recipes.forEach(recipe => {
        let li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <div>
                <div class="item-title">${recipe.name}</div>
                <div class="item-sub">100g du plat • ${recipe.calories} kcal</div>
            </div>
            <button class="delete-btn" onclick="deleteRecipe('${recipe.id}')">&times;</button>
        `;
        recipeList.appendChild(li);
    });
}

// Rendu du Profil & Gestion des Champs Dynamiques
function renderProfile() {
    if (!state.profile) return;
    document.getElementById('prof-weight').value = state.profile.weight || '';
    document.getElementById('prof-height').value = state.profile.height || '';
    document.getElementById('prof-age').value = state.profile.age || '';
    document.getElementById('prof-gender').value = state.profile.gender || 'male';
    document.getElementById('prof-activity').value = state.profile.activity || '1.15';
    document.getElementById('prof-goal').value = state.profile.goal || 'maintain';
    document.getElementById('prof-target-weight').value = state.profile.targetWeight || '';
    document.getElementById('prof-target-days').value = state.profile.targetDays || '';

    toggleGoalFields();
    updateLiveIndicator();
}

function toggleGoalFields() {
    const goal = document.getElementById('prof-goal').value;
    const container = document.getElementById('goal-custom-container');
    if (goal === 'cut' || goal === 'bulk') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
    updateLiveIndicator();
}

function updateLiveIndicator() {
    const weight = parseFloat(document.getElementById('prof-weight').value);
    const height = parseFloat(document.getElementById('prof-height').value);
    const age = parseFloat(document.getElementById('prof-age').value);
    const gender = document.getElementById('prof-gender').value;
    const activity = parseFloat(document.getElementById('prof-activity').value);
    const goal = document.getElementById('prof-goal').value;
    const targetWeight = parseFloat(document.getElementById('prof-target-weight').value);
    const targetDays = parseFloat(document.getElementById('prof-target-days').value);

    const indicator = document.getElementById('goal-indicator');

    if (goal === 'maintain') {
        indicator.style.display = 'none';
        return;
    }

    if (!weight || !height || !age || !targetWeight || !targetDays || targetDays <= 0) {
        indicator.style.display = 'none';
        return;
    }

    // Calcul BMR & TDEE
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;
    let tdee = bmr * activity;

    let deltaKg = targetWeight - weight;
    let deltaCalDaily = (deltaKg * 7700) / targetDays;
    let targetCal = tdee + deltaCalDaily;

    indicator.style.display = 'block';

    // Analyse de faisabilité et sécurité
    if (goal === 'bulk') {
        if (deltaKg <= 0) {
            indicator.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
            indicator.style.border = '1px solid #E74C3C';
            indicator.style.color = '#E74C3C';
            indicator.innerHTML = '⚠️ Pour une prise de masse, votre poids cible doit être supérieur à votre poids actuel.';
        } else if (deltaCalDaily <= 500) {
            indicator.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
            indicator.style.border = '1px solid #2ECC71';
            indicator.style.color = '#2ECC71';
            indicator.innerHTML = `✅ <b>Objectif optimal !</b> Surplus de +${Math.round(deltaCalDaily)} kcal/jour (~${(deltaKg / (targetDays / 7)).toFixed(2)} kg/semaine). Prise de muscle propre.`;
        } else if (deltaCalDaily <= 700) {
            indicator.style.backgroundColor = 'rgba(241, 196, 15, 0.2)';
            indicator.style.border = '1px solid #F1C40F';
            indicator.style.color = '#F1C40F';
            indicator.innerHTML = `⚠️ <b>Attention :</b> Surplus élevé de +${Math.round(deltaCalDaily)} kcal/jour (~${(deltaKg / (targetDays / 7)).toFixed(2)} kg/semaine). Risque de prise de gras associée.`;
        } else {
            indicator.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
            indicator.style.border = '1px solid #E74C3C';
            indicator.style.color = '#E74C3C';
            indicator.innerHTML = `🚨 <b>Objectif irréaliste :</b> Surplus de +${Math.round(deltaCalDaily)} kcal/jour. Prise de gras massive assurée. Allongez la durée en jours.`;
        }
    } else if (goal === 'cut') {
        if (deltaKg >= 0) {
            indicator.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
            indicator.style.border = '1px solid #E74C3C';
            indicator.style.color = '#E74C3C';
            indicator.innerHTML = '⚠️ Pour une perte de poids, votre poids cible doit être inférieur à votre poids actuel.';
        } else if (targetCal < bmr) {
            indicator.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
            indicator.style.border = '1px solid #E74C3C';
            indicator.style.color = '#E74C3C';
            indicator.innerHTML = `🚨 <b>Danger santé :</b> Le total (${Math.round(targetCal)} kcal) est sous votre métabolisme de base (${Math.round(bmr)} kcal). Risque fort de fatigue et perte musculaire. Augmentez la durée.`;
        } else if (Math.abs(deltaCalDaily) <= 700) {
            indicator.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
            indicator.style.border = '1px solid #2ECC71';
            indicator.style.color = '#2ECC71';
            indicator.innerHTML = `✅ <b>Perte saine !</b> Déficit de ${Math.round(deltaCalDaily)} kcal/jour (~${Math.abs(deltaKg / (targetDays / 7)).toFixed(2)} kg/semaine). Masse musculaire préservée.`;
        } else {
            indicator.style.backgroundColor = 'rgba(241, 196, 15, 0.2)';
            indicator.style.border = '1px solid #F1C40F';
            indicator.style.color = '#F1C40F';
            indicator.innerHTML = `⚠️ <b>Sèche très agressive :</b> Déficit de ${Math.round(deltaCalDaily)} kcal/jour. Attention à la fatigue et à la perte de muscle.`;
        }
    }
}

function renderAll() {
    renderDashboard();
    renderBDD();
    renderProfile();
}

// ==========================================
// 4. ÉVÉNEMENTS & FORMULAIRES
// ==========================================
function setupEventListeners() {
    // Écouteurs pour la mise à jour dynamique de l'indicateur
    ['prof-weight', 'prof-height', 'prof-age', 'prof-gender', 'prof-activity', 'prof-target-weight', 'prof-target-days'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateLiveIndicator);
            el.addEventListener('change', updateLiveIndicator);
        }
    });

    // Profil Form
    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const weight = parseFloat(document.getElementById('prof-weight').value);
        const height = parseFloat(document.getElementById('prof-height').value);
        const age = parseFloat(document.getElementById('prof-age').value);
        const gender = document.getElementById('prof-gender').value;
        const activity = parseFloat(document.getElementById('prof-activity').value);
        const goal = document.getElementById('prof-goal').value;
        const targetWeight = parseFloat(document.getElementById('prof-target-weight').value) || '';
        const targetDays = parseFloat(document.getElementById('prof-target-days').value) || '';

        state.profile = { weight, height, age, gender, activity, goal, targetWeight, targetDays };

        // Calcul BMR & TDEE
        if (weight && height && age) {
            let bmr = (10 * weight) + (6.25 * height) - (5 * age);
            bmr += (gender === 'male') ? 5 : -161;
            let tdee = bmr * activity;

            let targetCal = tdee;

            if ((goal === 'cut' || goal === 'bulk') && targetWeight && targetDays > 0) {
                let deltaKg = targetWeight - weight;
                let deltaCalDaily = (deltaKg * 7700) / targetDays;
                targetCal = tdee + deltaCalDaily;
            }

            state.goals.calories = Math.round(targetCal);

            // Répartition conseillée des Macros
            let proteinMultiplier = (goal === 'cut') ? 2.2 : 2.0;
            state.goals.protein = Math.round(weight * proteinMultiplier);
            state.goals.fat = Math.round(weight * 0.9); // 0.9g/kg
            
            // Complément direct en glucides
            let remainingCal = state.goals.calories - (state.goals.protein * 4) - (state.goals.fat * 9);
            state.goals.carb = Math.max(0, Math.round(remainingCal / 4));
            state.goals.sugar = Math.round(state.goals.calories * 0.10 / 4); // max 10% des calories
            state.goals.fiber = 30; // standard
        }

        saveData();
        alert('Profil et objectifs mis à jour !');
    });

    // Food Form
    document.getElementById('food-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const food = {
            id: 'f_' + Date.now(),
            name: document.getElementById('food-name').value,
            calories: parseFloat(document.getElementById('food-cal').value) || 0,
            protein: parseFloat(document.getElementById('food-prot').value) || 0,
            carb: parseFloat(document.getElementById('food-carb').value) || 0,
            sugar: parseFloat(document.getElementById('food-sug').value) || 0,
            fat: parseFloat(document.getElementById('food-fat').value) || 0,
            fiber: parseFloat(document.getElementById('food-fib').value) || 0
        };

        state.foods.push(food);
        saveData();
        closeModal('modal-food');
        document.getElementById('food-form').reset();
    });

    // Log Form
    document.getElementById('log-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const itemId = document.getElementById('log-select').value;
        const amount = parseFloat(document.getElementById('log-amount').value) || 0;

        if (itemId && amount > 0) {
            state.logs.push({ itemId, amount });
            saveData();
            closeModal('modal-log');
        }
    });

    // Recipe Form
    document.getElementById('recipe-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('recipe-name').value;
        const rows = document.querySelectorAll('.recipe-row');

        let totalWeight = 0;
        let totals = { calories: 0, protein: 0, carb: 0, sugar: 0, fat: 0, fiber: 0 };

        rows.forEach(row => {
            let foodId = row.querySelector('.recipe-food-select').value;
            let weight = parseFloat(row.querySelector('.recipe-food-weight').value) || 0;
            let food = state.foods.find(f => f.id === foodId);

            if (food && weight > 0) {
                totalWeight += weight;
                let ratio = weight / 100;
                totals.calories += food.calories * ratio;
                totals.protein += food.protein * ratio;
                totals.carb += food.carb * ratio;
                totals.sugar += food.sugar * ratio;
                totals.fat += food.fat * ratio;
                totals.fiber += food.fiber * ratio;
            }
        });

        if (totalWeight === 0) return;

        // Normalisation pour 100g du plat final
        let ratio100g = 100 / totalWeight;
        const recipe = {
            id: 'r_' + Date.now(),
            name: name,
            calories: Math.round(totals.calories * ratio100g),
            protein: Math.round(totals.protein * ratio100g * 10) / 10,
            carb: Math.round(totals.carb * ratio100g * 10) / 10,
            sugar: Math.round(totals.sugar * ratio100g * 10) / 10,
            fat: Math.round(totals.fat * ratio100g * 10) / 10,
            fiber: Math.round(totals.fiber * ratio100g * 10) / 10
        };

        state.recipes.push(recipe);
        saveData();
        closeModal('modal-recipe');
        document.getElementById('recipe-form').reset();
    });
}

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================
function populateLogSelect() {
    const select = document.getElementById('log-select');
    select.innerHTML = '';

    if (state.foods.length > 0) {
        let group = document.createElement('optgroup');
        group.label = 'Aliments';
        state.foods.forEach(f => {
            group.innerHTML += `<option value="${f.id}">${f.name} (${f.calories} kcal/100g)</option>`;
        });
        select.appendChild(group);
    }

    if (state.recipes.length > 0) {
        let group = document.createElement('optgroup');
        group.label = 'Plats';
        state.recipes.forEach(r => {
            group.innerHTML += `<option value="${r.id}">${r.name} (${r.calories} kcal/100g)</option>`;
        });
        select.appendChild(group);
    }
}

function prepareRecipeForm() {
    const container = document.getElementById('recipe-ingredients-container');
    container.innerHTML = '';
    addIngredientRow();
}

function addIngredientRow() {
    const container = document.getElementById('recipe-ingredients-container');
    const div = document.createElement('div');
    div.className = 'recipe-row';
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';

    let selectHTML = '<select class="recipe-food-select" style="flex:2;">';
    state.foods.forEach(f => {
        selectHTML += `<option value="${f.id}">${f.name}</option>`;
    });
    selectHTML += '</select>';

    div.innerHTML = `
        ${selectHTML}
        <input type="number" class="recipe-food-weight" placeholder="g" value="100" style="flex:1;">
        <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--danger-color); font-size:1.2rem;">&times;</button>
    `;
    container.appendChild(div);
}

function deleteLog(index) {
    state.logs.splice(index, 1);
    saveData();
}

function deleteFood(id) {
    state.foods = state.foods.filter(f => f.id !== id);
    saveData();
}

function deleteRecipe(id) {
    state.recipes = state.recipes.filter(r => r.id !== id);
    saveData();
}
