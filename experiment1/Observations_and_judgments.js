

// There will be one array per observation, with each array being a series of key:value pairs with keys:

// a, b, c, d and d, corresponding to the variables with priors 0.9, 0.6, 0.4, 0.1. 
// R1O, R1J, respectively the outcomes and causal judgments obtained for rule 1 on that
// particular observation. 

// The rules are numbered in the following order: 
// R1 = at least 2(a, b, c, d)
// R2 = (a || d) & c
// R3 = (a & d) || c
// R4 = a & b & d


// Dictionary mapping the variable indices to their respective probabilities: 

const mapping_priors = [{ 'a': 0.9 }, { 'b': 0.6 }, { 'c': 0.4 }, { 'd': 0.1 }]
var priors_dict = {};
mapping_priors.map(o => { priors_dict[Object.keys(o)[0]] = Object.values(o)[0] });

const mapping_rules = [
    { 'R1': 'a + b + c + d >= 2' },
    { 'R2': '(a || d) & c' },
    { 'R3': '(a & d) || c' },
    { 'R4': 'a & b & d' }
];
var rules_dict = {};
mapping_rules.map(o => { rules_dict[Object.keys(o)] = Object.values(o)[0] });


// Now arrays for the observations: 
var observation_1 = [
    { 'a': 1 }, { 'b': 1 }, { 'c': 0 }, { 'd': 0 },
    { 'R1O': 1 }, { 'R1J': ['a', 'b'] },
    { 'R2O': 0 }, { 'R2J': ['c'] },
    { 'R3O': 0 }, { 'R3J': ['c', 'd'] },
    { 'R4O': 0 }, { 'R4J': ['d'] }]
var D_obs_1 = {};
observation_1.map(o => { D_obs_1[Object.keys(o)[0]] = Object.values(o)[0] });

var observation_2 = [
    { 'a': 1 }, { 'b': 0 }, { 'c': 1 }, { 'd': 0 },
    { 'R1O': 1 }, { 'R1J': ['a', 'c'] },
    { 'R2O': 1 }, { 'R2J': ['a', 'c'] },
    { 'R3O': 1 }, { 'R3J': ['c'] },
    { 'R4O': 0 }, { 'R4J': ['d'] }]
var D_obs_2 = {};
observation_2.map(o => { D_obs_2[Object.keys(o)[0]] = Object.values(o)[0] });

var observation_3 = [
    { 'a': 0 }, { 'b': 1 }, { 'c': 0 }, { 'd': 0 },
    { 'R1O': 0 }, { 'R1J': ['a', 'c', 'd'] },
    { 'R2O': 0 }, { 'R2J': ['a', 'c'] },
    { 'R3O': 0 }, { 'R3J': ['c'] },
    { 'R4O': 0 }, { 'R4J': ['d'] }]
var D_obs_3 = {};
observation_3.map(o => { D_obs_3[Object.keys(o)[0]] = Object.values(o)[0] });

var observation_4 = [
    { 'a': 1 }, { 'b': 1 }, { 'c': 1 }, { 'd': 1 },
    { 'R1O': 1 }, { 'R1J': ['a', 'b'] },
    { 'R2O': 1 }, { 'R2J': ['a', 'c'] },
    { 'R3O': 1 }, { 'R3J': ['c'] },
    { 'R4O': 1 }, { 'R4J': ['a', 'b', 'd'] }]
var D_obs_4 = {};
observation_4.map(o => { D_obs_4[Object.keys(o)[0]] = Object.values(o)[0] });

var D_observations = [D_obs_1, D_obs_2, D_obs_3, D_obs_4];


// Array for the instruction trial: 
var observation_instruction_1 = [
    { 'a': 0} ,  {'b': 1 },
    { 'R0O': 1 }, { 'R1J': ['b'] },
    ]
var D_ins_1 = {};
observation_instruction_1.map(o => { D_ins_1[Object.keys(o)[0]] = Object.values(o)[0] });

console.log(D_obs_4)

////////////////////////////////////////////
// Generating Test trials
////////////////////////////////////////////

var testTrials = generateTestTrials();

function generateTestTrials() {
    let trials = []
    for (a in [0, 1]) {
        for (b in [0, 1]) {
            for (c in [0, 1]) {
                for (d in [0, 1]) {
                    let trial = [a, b, c, d].map((e)=>parseInt(e));
                    // if (!checkArray([[1, 1, 1, 1], [1, 1, 0, 0], [0, 1, 0, 0], [1, 0, 1, 0]],trial)) {
                        trials.push({
                            'a': trial[0], 'b': trial[1], 'c': trial[2], 'd': trial[3],
                            'R1O': rule1(trial),
                            'R2O': rule2(trial),
                            'R3O': rule3(trial),
                            'R4O': rule4(trial),
                            'R0O': rule0(trial),
                        });
                    // }
                }
            }
        }
    }
    return trials;
}

// RUles to evaluate trials
function rule1(trial) {
    return Math.min(trial.reduce((partialSum, a) => partialSum + a, 0) >= 2);
}
function rule2(trial) {
    return (trial[0] || trial[3]) & trial[2];
}
function rule3(trial) {
    return (trial[0] & trial[3]) || trial[2];
}
function rule4(trial) {
    return trial[0] & trial[1] & trial[3];
}

function rule0(trial) {
 // return (a or b)
    return trial[0] || trial[1];
}


function arrayEquals(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index]);
};
function checkArray(array, val) {
    for (const arr of array) {
        if (arrayEquals(val, arr)) {
            return true;
        }
    };
    return false;
};