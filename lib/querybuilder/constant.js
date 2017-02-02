'use strict';

/**
 * @expose
 */
module.exports = {
  QUERIES: {
    // Comparison Operators
    $gt:  '{0} > {1}',
    $gte: '{0} >= {1}',
    $lt:  '{0} < {1}',
    $lte: '{0} <= {1}',
    $ne:  '{0} <> {1}', // !=

    $in:  {
      format: '{0} IN ({1})',
      name: 'IN',
      type: 'built-in',
      func: function IN(arr, key) {
        return Array.isArray(arr) ? arr.map((v)=>{
          if (typeof v === "string" || key === "id") {
            return `'${v}'`;
          } 
          return v;
        }).join(",") : arr.toString();
      }
    },

    $be:  {
      format: '({0} BETWEEN {1})',
      name: 'IN',
      type: 'built-in',
      func: function BETWEEN(arr) {
        return Array.isArray(arr) ? "\""+ arr[0].toString() + "\" AND \"" + arr[1].toString() + "\"" : arr.toString();
      }
    },

    // Pre Defined Functions
    $uin:  {
      format: 'udf.inUDF({0}, {1})',
      name: 'inUDF',
      type: 'udf',
      func: function $in(arr, val) {
        return Array.isArray(arr) ? arr.some(function(e) { return e === val }) : false;
      }
    },
    $all: {
      format: 'udf.allUDF({0}, {1})',
      name: 'allUDF',
      type: 'udf',
      func: function $all(arr, val) {
        return Array.isArray(arr) ? arr.every(function(e) { return e === val }) : false;
      }
    },
    $size: {
      format: 'udf.sizeUDF({0}, {1})',
      name: 'sizeUDF',
      type: 'udf',
      func: function $size(arr, len) { return arr.length === len; }
    },
    $regex: {
      format: 'udf.regexUDF({0}, {1})',
      name: 'regexUDF',
      type: 'udf',
      func: function $regex(string, regex) { return new RegExp(regex).test(string); }
    },
    $type: {
      format: 'udf.typeUDF({0}, {1})',
      name: 'typeUDF',
      type: 'udf',
      func: function $type(object, type) { return typeof object === type; }
    }
  }
};