//functions for list with 1 level
var rm_duplicate_1 = function(arr) {
  var i;
  var arr_unique = new Array;
  for (i in arr) {
    if (arr_unique.indexOf(arr[i]) == -1) {
      arr_unique.push(arr[i]);
    }
  }
  return arr_unique
};

var difference_1 = function(arr1, arr2) {
  var i;
  var j;
  var arr_diff = new Array;
  for (i in arr1) {
    if (arr2.indexOf(arr1[i]) == -1) {
      arr_diff.push(arr1[i]);
    }
  }
  for (j in arr2) {
    if (arr1.indexOf(arr2[j]) == -1) {
      arr_diff.push(arr2[j]);
    }
  }
  return rm_duplicate_1(arr_diff);
};

var intersection_1 = function(arr1, arr2) {
  var i;
  var arr_int = new Array;
  for (i in arr1) {
    if (arr2.indexOf(arr1[i]) != -1) {
      arr_int.push(arr1[i]);
    }
  }
  return rm_duplicate_1(arr_int);
};

var union_1 = function(arr1, arr2) {
  var i;
  var j;
  var arr_un = new Array;
  for (i in arr1) {
    arr_un.push(arr1[i]);
  }
  for (j in arr2) {
    arr_un.push(arr2[j])
  }
  return rm_duplicate(arr_un);
};

// functions for list with n levels

// indexOf function for lists containing lists
// return the index of the element or -1
var indexOfList = function(list, element) {
  var i;
  for (i in list) {
    var indic = true;
    for (var j = 0; j < element.length; j++) {
      if (list[i][j] != element[j]) {indic = false;}
    }
    if (indic == true) {return i}
  }
  return -1
}

var rm_duplicate = function(arr) {
  var i;
  var arr_unique = new Array;
  for (i in arr) {
    if (indexOfList(arr_unique,arr[i]) == -1) {
      arr_unique.push(arr[i]);
    }
  }
  return arr_unique
};

// if arr2 contains lists not in arr1, they are in the output
// not a problem for the use done in piece_creator.js
var difference = function(arr1, arr2) {
  var i;
  var j;
  var arr_diff = new Array;
  for (i in arr1) {
    if (indexOfList(arr2, arr1[i]) == -1) {
      arr_diff.push(arr1[i]);
    }
  }
  for (j in arr2) {
    if (indexOfList(arr1, arr2[j]) == -1) {
      arr_diff.push(arr2[j]);
    }
  }
  return arr_diff;
};

var intersection = function(arr1, arr2) {
  var i;
  var arr_int = new Array;
  for (i in arr1) {
    if (indexOfList(arr2, arr1[i]) != -1) {
      arr_int.push(arr1[i]);
    }
  }
  return rm_duplicate(arr_int);
};

var union = function(arr1, arr2) {
  var i;
  var j;
  var arr_un = new Array;
  for (i in arr1) {
    arr_un.push(arr1[i]);
  }
  for (j in arr2) {
    arr_un.push(arr2[j])
  }
  return rm_duplicate(arr_un);
};

// remove cell outside the grid
// works only for square grid of dimension n
var rm_impossible = function(arr0, n) {
  var i;
  var j;
  var arr1 = arr0.slice();
  for (i in arr0) {
    for (j in arr0[i]) {
      if (arr0[i][j] < 0 || arr0[i][j] > n-1) {
        indice = indexOfList(arr1, arr0[i])
        if (indice != -1) {
          arr1.splice(indice,1)
        }
      }
    }
  }
  return arr1
}

// the following works only for square grids of dimension n

// take an array containing a cell and gives the coordinates of the contiguous
// cells
// only for square grids
var contiguous = function(cell, n) {
  var list = new Array;
  for (var i = -1; i < 2; i++) {
    for (var j = -1; j < 2; j++) {
      var x = cell[0][0] + i;
      var y = cell[0][1] + j;
      list.push([x, y]);
    }
  }
  return rm_impossible(difference(list, cell), n);
};


// create a piece of a definite size on a grid given forbidden cells
var piece_creator = function(grid, list_forbid, size) {
  var piece = new Array;
  var list_OK = difference(grid, list_forbid);

  var grid_dim = Math.sqrt(grid.length)

  if (list_OK.length == 0) {
    //console.log("no_choice")
    return "no_choice";
  }

  var picked = jsPsych.randomization.sampleWithoutReplacement(list_OK, 1);
  piece.push(picked[0]);

  var list_contiguous = contiguous(picked, grid_dim);
  list_OK.splice(indexOfList(list_OK, picked[0]), 1);

  for (var i = 1; i < size; i++) {
    list_choice = intersection(list_OK, list_contiguous);
    if (list_choice.length == 0) {
      return "no_choice";
    }
    picked = jsPsych.randomization.sampleWithoutReplacement(list_choice, 1);
    piece.push(picked[0]);

    list_contiguous = union(list_contiguous, contiguous(picked, grid_dim));
    list_OK.splice(indexOfList(list_OK, picked[0]), 1);
  }

  var list_nope = rm_impossible(union(union(list_forbid, piece), list_contiguous));

  return [piece, list_nope];
};


// dummy function
var piece_loop = function(grid, list_nope, piece_format) {
  var l;
  var target = new Array;
  for (k in piece_format) {
    a = piece_creator(grid, list_nope, piece_format[k]);
    if (a == "no_choice") {
      return "not_possible";
    }
    for (l in a[0]) {
      target.push(a[0][l]);
    }
    list_nope = a[1];
  }
  return target;
};


// create an array containing pieces which sizes are given in the list format
// please give something doable, otherwise the loop will never stop
// if the loop runs more than 10 000 times, the program stops
var target_maker = function(piece_format, grid_dimensions) {
  var ok = false;
  var list_nope = new Array;
  var target;
  var stopper = 0;

  var grid = new Array;
  for (var i = 0; i < grid_dimensions[0]; i++) {
    for (var j = 0; j < grid_dimensions[1]; j++) {
      grid.push([i, j]);
    }
  }

  var k;
  var l;
  var b;
  while (ok != true) {
    if (stopper > 20) {
      console.log("not_doable")
      return "not_doable";
    }
    list_nope = [];
    target = piece_loop(grid, list_nope, piece_format);
    if (target != "not_possible") {
      ok = true;
    }
    else if (target == "not_possible") {
      stopper += 1;
    }
  }
  return target;
};


//takes a grid and gives the lines of the grid
var lines_giver = function(grid_dim) {
  var targets = [];
  var lignes = [];
  for (var i = 0; i < grid_dim[0]; i++) {
    var line = [];
    for (var j = 0; j < grid_dim[1]; j++) {
      line.push([i,j]);
    }
    lignes.push(line);
  }
  for (var k = 0; k < grid_dim[1]; k++) {
    var line = [];
    for (var m = 0; m < grid_dim[0]; m++) {
      line.push([m,k]);
    }
    lignes.push(line);
  }
  return lignes;
};

//creates nb targets of level lvl for grid of dimensions grid_dim
var targets_creator = function(nb, lvl, grid_dim) {
  var targets = []
  if (lvl == 1) {
    var lines = lines_giver(grid_dim)
    targets = jsPsych.randomization.sampleWithReplacement(lines, nb);
  }
  if (lvl == 2) {
    var combin_list = [[3,2,1], [1,1,1], [2,2,2]]
    var current;
    for (var i = 0; i < nb; i++) {
      current = jsPsych.randomization.sampleWithReplacement(combin_list, 1)[0]
      targets.push(target_maker(current, grid_dim));
    }
  }
  return targets;
};

//takes a grid and gives the lines of the grid
var lines_giver = function(grid_dim) {
  var targets = [];
  var lignes = [];
  for (var i = 0; i < grid_dim[0]; i++) {
    var line = [];
    for (var j = 0; j < grid_dim[1]; j++) {
      line.push([i,j]);
    }
    lignes.push(line);
  }
  for (var k = 0; k < grid_dim[1]; k++) {
    var line = [];
    for (var m = 0; m < grid_dim[0]; m++) {
      line.push([m,k]);
    }
    lignes.push(line);
  }
  return lignes;
};

//creates nb targets of level lvl for grid of dimensions grid_dim
var targets_creator = function(nb, lvl, grid_dim) {
  var targets = []
  if (lvl == 1) {
    var lines = lines_giver(grid_dim)
    targets = jsPsych.randomization.sampleWithReplacement(lines, nb);
  }
  if (lvl == 2) {
    var combin_list = [[3,2,1], [1,1,1], [2,2,2]]
    var current;
    for (var i = 0; i < nb; i++) {
      current = jsPsych.randomization.sampleWithReplacement(combin_list, 1)[0]
      targets.push(target_maker(current, grid_dim));
    }
  }
  return targets;
};
