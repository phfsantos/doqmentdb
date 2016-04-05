'use strict';
var QUERIES = require('./constant').QUERIES
  , _       = require('../utils')
  , filter  = require('./filter');

function QueryBuilder(){
    
    this.select = function(s){
        this._s = s;
         return this;
    };
    
    this.from = function(f){
        this._f = f;     
        return this;   
    };
    
    this.join = function(j){
        this._j = j;
         return this;
    };
    
    this.where = function(w){
        this._w = w; 
         return this;       
    };
    
    this.order = function(o){
        this._o = o;
         return this;
    };
    
    this.limit = function(l){
        this._l = l;
         return this;        
    };
    
    
     /**
      * Clears active record
      * @memberOf DBModel
      * @returns {object} this - PS.DB.Base
      */
     this.clear = function() {
         this._s = this._j = this._f = this._w = this._o = undefined;
         return this;
     },   
    
     this.build = function(object) {
          /**
           * @description
           * The stored UDF function
           * one or more UDF function. else, should returns as a query string.
           */
          var udfArray = [], 
              BASE_QUERY = '',
              from = !this._f?"root":this._f,
              select = (!this._s?"*":this._s),
              limit = (this._l?"TOP " + this._l + " ":"");
          
        
        /* Build Base query */
          //SELECT clause
          BASE_QUERY = "SELECT " + limit + select;
          //FROM clause
          BASE_QUERY += " FROM " + from;
          //JOIN clause
          BASE_QUERY += this._j?  " JOIN " + this._j:"";
          //WHERE clause
          BASE_QUERY +=  " WHERE ";
          //ORDER clause
          BASE_QUERY +=  this._o?" ORDER BY " + this._o:"";
        
          this.clear();
         
          //Replace Object with where object
          if(!object && this._w){
              object = this._w;
          }
          /**
           * @description
           * query builder
           * @param {Object} object
           * @param {Boolean=} not
           * @returns {String}
           */
          function queryArray(object, not, from) {
            var subLevel = null;
            var queryArrayResult = _.keys(object).map(function(key) {
                var value = object[key];
                if(key == '$not') return filter.wrap(query(value, true), 'NOT(', ')');
                if(key == '$nor') return query({ $not: { $or: value } });
                if(_.isObject(value)) {
                    var fKey = _.first(_.keys(value));
                    // if it's a condition operator || function
                    if(QUERIES[fKey]) {
                        var val = QUERIES[fKey], 
                            op  = val.format || val;
                        if(_.isObject(val)) udfArray.push({ id: val.name, body: val.func });
                        return filter.format(from + "." +op, key, filter.toString(value[fKey]));

                    // if it's a conjunctive operator
                    } else if(~['$or', '$and'].indexOf(key)) {
                        var cQuery = conjunctive(value, key.replace('$', '').toUpperCase()); // .. OR ..
                        // Wrap with `NOT`, or single condition
                        return (value.length > 1) && !not ? filter.wrap(cQuery, '(', ')') : cQuery;
                    } else {
                        subLevel = queryArray(value, not, key);
                        if(subLevel){ 
                            return from + "." + subLevel.join(" AND " + from + ".");
                        } else {
                            throw Error('invalid operator');
                        }
                    }
                }
                return filter.format(from + '.{0}={1}', key, filter.toString(value));
            });
              
            return queryArrayResult;
          }
          /**
           * @description
           * query builder
           * @param {Object} object
           * @param {Boolean=} not
           * @returns {String}
           */
          function query(object, not) {
            console.log("query");
            console.log(object);
            var subLevel = null;
            var queryResult = queryArray(object, not, from).join(' AND ');
              
            console.log("queryResult");
            console.log(queryResult);
            return queryResult;
          }

          /**
           * @description
           * concat with conjunctive operator
           * @param array
           * @param operator
           * @returns {*}
           */
          function conjunctive(array, operator) {
            return array.map(function(el) {
              var qStr = query(el);
              return  _.keys(el).length > 1 ? filter.wrap(qStr, '(', ')') : qStr;
            }).join(' '  + operator + ' ');
          }

          // if it's an empty object
          if(_.isObject(object) && _.isEmpty(object)) {
            return BASE_QUERY.replace(' WHERE', '');
          }

          /**
           * @returns {*}
           * if there's a udf functions in the query string,
           * return object contains qs and udf too.
           */
          var queryStr = [BASE_QUERY, (_.isString(object) ? object  : query(object))].join(' '); // concat base + queryString
         
         var resultQuery = _.isEmpty(udfArray) ? queryStr : { query: queryStr, udf: udfArray };//if no udf function then query string else { query s"tring, udf "array }
         console.log("resultQuery");
         console.log(resultQuery);
          return resultQuery;
     };
     
     return this;
}

/**
 * @expose
 */
module.exports = QueryBuilder;
