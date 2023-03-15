

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

const mapping_priors = [{'a' : 0.9}, {'b': 0.6}, {'c': 0.4}, {'d':0.1}]
const mapping_rules = [
    {'R1':'a + b + c + d >= 2'},
    {'R2':'(a || d) & c'},
    {'R3':'(a & d) || c'},
    {'R4':'a & b & d'}]



    // Now arrays for the observations: 


var observation_1 = [
    {'a' : 1}, {'b': 1}, {'c': 0}, {'d':0}, 
    {'R1O': 1}, {'R1J': ['a', 'b']},
    {'R2O': 0}, {'R2J': ['c']},
    {'R3O': 0}, {'R3J': ['c', 'd']},
    {'R4O': 0}, {'R4J': ['d']}]
var observation_2 = [
    {'a' : 1}, {'b': 0}, {'c': 1}, {'d':0}, 
    {'R1O': 1}, {'R1J': ['a', 'c']},
    {'R2O': 1}, {'R2J': ['a', 'c']},
    {'R3O': 1}, {'R3J': ['c']},
    {'R4O': 0}, {'R4J': ['d']}]
var observation_3 = [
    {'a' : 0}, {'b': 1}, {'c': 0}, {'d':0}, 
    {'R1O': 0}, {'R1J': ['a', 'c', 'd']},
    {'R2O': 0}, {'R2J': ['a', 'c']},
    {'R3O': 0}, {'R3J': ['c']},
    {'R4O': 0}, {'R4J': ['d']}]
var observation_4 = [
    {'a' : 1}, {'b': 1}, {'c': 1}, {'d':1}, 
    {'R1O': 1}, {'R1J': ['a', 'b']},
    {'R2O': 1}, {'R2J': ['a','c']},
    {'R3O': 1}, {'R3J': ['c']},
    {'R4O': 1}, {'R4J': ['a', 'b', 'd']}]


