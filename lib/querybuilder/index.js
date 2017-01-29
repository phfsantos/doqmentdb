"use strict";
var QUERIES = require("./constant").QUERIES,
    _ = require("../utils"),
    filter = require("./filter");

function QueryBuilder() {
    // Private variables
    var _select, _from, _join, _where, _order, _limit, _last_query;

    this.select = function (s) {
        _select = s;
        return this;
    };

    this.from = function (f) {
        _from = f;
        return this;
    };

    this.join = function (j) {
        _join = j;
        return this;
    };

    this.where = function (w) {
        _where = w;
        return this;
    };

    this.order = function (o) {
        _order = o;
        return this;
    };

    this.limit = function (l) {
        _limit = l;
        return this;
    };

    this.getLastQuery = function(){
        return _last_query;
    };

    /**
     * Clears active record
     * @memberOf DBModel
     * @returns {object} this - PS.DB.Base
     */
    this.clear = function (o) {
        o._docs = o._self = _select = _join = _from = _where = _order = _limit = undefined;
        delete o._docs;
        delete o._self;

        return this;
    },

    this.build = function (object) {
        /**
         * @description
         * The stored UDF function
         * one or more UDF function. else, should returns as a query string.
         */
        var udfArray = [],
            fromFragments = [],
            keys = [],
            BASE_QUERY = "SELECT * FROM root r WHERE",
            from = !_from ? "root r" : _from,
            select = (!_select ? "*" : _select),
            limit = (_limit ? "TOP " + _limit + " " : "");

        //console.log("Check to see if we are searching for Documents", _.type(object), object);
        if (_.type(object) == "Document") {
            /* Build Base query */
            //SELECT clause
            BASE_QUERY = "SELECT " + limit + select;

            //FROM clause
            BASE_QUERY += " FROM " + from;

            //JOIN clause
            BASE_QUERY += _join ? " JOIN " + _join : "";

            //WHERE clause
            BASE_QUERY += " WHERE ";

            //ORDER clause
            BASE_QUERY += _order ? " ORDER BY " + _order : "";

            //Replace Object with where object
            if (!object && _where) {
                object = _where;
            }
            //Reset on any kind of search on documents
            this.clear(object);
        } else {
            delete object._self;
        }

        fromFragments = from.split(" ");
        // Get the last fragment(alias of the root)
        // Some thing like "root r" we get r as the root name
        // then we can use r.{var}
        from = fromFragments[fromFragments.length - 1];
        
        /**
         * @description
         * query builder
         * @param {Object} object
         * @param {Boolean=} not
         * @returns {String}
         */
        function query(object, not) {
            return _.keys(object).map(function(key) {
                var value = object[key];
                if(key == "$not") return filter.wrap(query(value, true), "NOT(", ")");
                if(key == "$nor") return query({ $not: { $or: value } });
                if(_.isObject(value)) {
                    var fKey = _.first(_.keys(value));
                    // if it's a condition operator || function
                    if(QUERIES[fKey]) {
                        // Add to keys so that we can add from to them
                        keys.push(key);

                        // Variables
                        var operation = QUERIES[fKey]
                            , type  = operation.type || "built-in"
                            , format  = operation.format || operation;
                        
                        // Handle user defined functions
                        if(type === "udf" && _.isObject(operation)){
                            udfArray.push({ id: operation.name, body: operation.func });
                        }

                        // Handle built-in functions
                        if(type === "built-in" && _.isObject(operation)){
                            return filter.format(format, key, operation.func(value[fKey]));
                        }

                        // Basic operations $gt $lt etc
                        return filter.format(format, key, filter.toString(value[fKey]));
                    // if it's a conjunctive operator
                    } else if(~["$or", "$and"].indexOf(key)) {
                        var cQuery = conjunctive(value, key.replace("$", "").toUpperCase()); // .. OR ..
                        // Wrap with `NOT`, or single condition
                        return (value.length > 1) && !not
                            ? filter.wrap(cQuery, "(", ")")
                            : cQuery;
                    } else {
                        throw Error("invalid operator");
                    }
                }
                // Add to keys so that we can add from to them
                keys.push(key);
                return filter.format("{0}={1}", key, filter.toString(value));
            }).join(" AND ");
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
                return  _.keys(el).length > 1
                ? filter.wrap(qStr, "(", ")")
                : qStr;
            }).join(" "  + operator + " ");
        }

        // if it's an empty object
        if (_.isObject(object) && _.isEmpty(object)) {
            return BASE_QUERY.replace(" WHERE", "");
        }

        /**
         * @returns {*}
         * if there's a udf functions in the query string,
         * return object contains qs and udf too.
         */
        var queryStr = BASE_QUERY.replace("WHERE", ["WHERE", (_.isString(object) ? object : query(object, false))].join(" ")); // concat base + queryString

        for(var i = 0; i < keys.length; i++){
            var key = keys[i];
            var replaceFrom = new RegExp("(" + from +  "\\." + ")?" + key, "g");
            queryStr = queryStr.replace(replaceFrom, from + "." + key);
        }

        var resultQuery = _.isEmpty(udfArray) ? queryStr : {
            query: queryStr,
            udf: udfArray
        }; //if no udf function then query string else { query s"tring, udf "array }

        // return the final query
        //console.log("Final Query: ", resultQuery);
        return resultQuery;
    };

    return this;
}

/**
 * @expose
 */
module.exports = QueryBuilder;