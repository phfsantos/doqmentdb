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
     this.clear = function(o) {
         o._docs = o._self = this._s = this._j = this._f = this._w = this._o = this._l = undefined;
         delete o._docs;
         delete o._self;
         delete this._s;
         delete this._o;
         delete this._f;
         delete this._w;
         delete this._l;
         delete this._j;

         return this;
     },   
    
     this.build = function(object) {
          /**
           * @description
           * The stored UDF function
           * one or more UDF function. else, should returns as a query string.
           */
          var udfArray = [], 
              BASE_QUERY = 'SELECT * FROM root WHERE',
              from = !this._f?"root":this._f,
              select = (!this._s?"*":this._s),
              limit = (this._l?"TOP " + this._l + " ":"");    
         
        //console.log("Check to see if we are searching for Documents", _.type(object), object);         
        if(_.type(object) == "Document"){
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
            //Replace Object with where object
            if(!object && this._w){
                object = this._w;
            }      
            //Reset on any kind of search on documents
            this.clear(object);         
        }else{
            delete object._self;
        }
         
          /**
           * @description
           * query builder
           * @param {Object} object
           * @param {Boolean=} not
           * @returns {String}
           */
          function queryArray(object, not, from, operation) {
            var subLevel = null;
            var joinType = operation?" " + operation + " ":' AND ';
            var queryArrayResult = _.keys(object).map(function(key) {
                var value = object[key];
                if(key == '$not') return filter.wrap(query(value, true, from), 'NOT(', ')');
                if(key == '$nor') return query({ $not: { $or: value } }, false, from);
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
                        //console.log("conjunctive")
                        var cQuery = query(value, not, from, key.replace("$", "").toUpperCase()); // .. OR ..
                        // Wrap with `NOT`, or single condition
                        //console.log("--------conjunctive----------", cQuery);
                        return (value.length > 1) && !not ? filter.wrap(cQuery, '(', ')') : cQuery;
                    } else {
                        console.log("subLevel");
                        subLevel = queryArray(value, not, key);
                        if(subLevel){ 
                            var prepend = (isFinite(from)?"": from + ".");
                            //console.log("subLevel", subLevel);
                            //console.log("from", from);
                            //console.log("key", key);
                            //console.log("prepend", prepend);
                            //console.log("joinType", joinType);
                            //console.log("---------subLevel---------");
                            return prepend + subLevel.join(joinType + prepend);
                        } else {
                            throw Error('invalid operator');
                        }
                    }
                }
               
                //console.log("no object");
                //console.log("from", from);
                //console.log("key", key);
                //console.log("------------------");
                if(isFinite(from) && isFinite(key)){
                    return filter.format('={0}', filter.toString(value));                    
                }else if(isFinite(key)){
                    return filter.format(from + '={0}', filter.toString(value));                    
                }else if(isFinite(from)){
                    return filter.format('{0}={1}', key, filter.toString(value));                    
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
          function query(object, not, from, operation) {
            var joinType = operation?" " + operation + " ":' AND ';
            var subLevel = null, queryResult = object;
            if(typeof object == "object"){                
                queryResult = queryArray(object, not, from, operation).join(joinType);
            }
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
          var queryStr = [BASE_QUERY, (_.isString(object) ? object  : query(object, false, from))].join(' '); // concat base + queryString
         
          var resultQuery = _.isEmpty(udfArray) ? queryStr : { query: queryStr, udf: udfArray };//if no udf function then query string else { query s"tring, udf "array }
          console.log("Final Query: ", resultQuery);
          return resultQuery;
     };
     
     return this;
}

/**
 * @expose
 */
module.exports = QueryBuilder;
