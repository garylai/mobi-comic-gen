'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const srcScript = fs.readFileSync(
    path.resolve(__dirname, '../node_modules/js-beautify/js/lib/unpackers/p_a_c_k_e_r_unpacker.js'),
    'utf8');

const unpackerScript = new vm.Script(srcScript);
unpackerScript.runInThisContext();
module.exports  = P_A_C_K_E_R;
