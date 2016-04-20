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

    // Pre Defined Functions
    $in:  {
      format: 'udf.inUDF({0}, {1})',
      name: 'inUDF',
      func: function $in(arr, val) {
        return Array.isArray(arr) ? arr.some(function(e) { return e === val }) : false;
      }
    },
    $all: {
      format: 'udf.allUDF({0}, {1})',
      name: 'allUDF',
      func: function $all(arr, val) {
        return Array.isArray(arr) ? arr.every(function(e) { return e === val }) : false;
      }
    },
    $size: {
      format: 'udf.sizeUDF({0}, {1})',
      name: 'sizeUDF',
      func: function $size(arr, len) { return arr.length === len; }
    },
    $regex: {
      format: 'udf.regexUDF({0}, {1})',
      name: 'regexUDF',
      func: function $regex(string, regex) { return new RegExp(regex).test(string); }
    },
    $type: {
      format: 'udf.typeUDF({0}, {1})',
      name: 'typeUDF',
      func: function $type(object, type) { return typeof object === type; }
    }
  }
};