'use strict';
/*global describe, it, beforeEach, afterEach, stub*/
var should = require('should')
  , queryBuilder = require('../../lib/querybuilder')
  , constant = require('../../lib/querybuilder/constant').QUERIES;

describe('QueryBuilder', function() {
  var BQ = 'SELECT * FROM root r WHERE ';
  var query = new queryBuilder();
  describe('test .query() behavior', function() {
    it('should work with empry', function() {
      query.build({}).should.eql('SELECT * FROM root r');
    });

    it('simple equal', function() {
      query.build({ "a.b": 1, "b.c": 2, "c.d": 3 }).should.eql(BQ + 'r.a.b=1 AND r.b.c=2 AND r.c.d=3');
      query.build({ a: "1", b: "2", c: "3" }).should.eql(BQ + 'r.a="1" AND r.b="2" AND r.c="3"');
    });

    it('simple equal with $not', function() {
      query.build({ $not: { a: 1, b: 2, c: 3 } }).should.eql(BQ + 'NOT(r.a=1 AND r.b=2 AND r.c=3)');
      query.build({ $not: { a: "1", b: "2", c: "3" } }).should.eql(BQ + 'NOT(r.a="1" AND r.b="2" AND r.c="3")');
    });

    it('should work with $not-$or as $nor', function() {
      query.build({ $not: { $or: [ { a: 1 } ] } }).should.eql(BQ + 'NOT(r.a=1)');
      query.build({ $not: { $or: [ { a: 1, b: 1 }, { c: 3 } ] } }).should.eql(BQ + 'NOT((r.a=1 AND r.b=1) OR r.c=3)');
      query.build({ $nor: [ { a: 1, b: 1 }, { c: 3 } ] }).should.eql(BQ + 'NOT((r.a=1 AND r.b=1) OR r.c=3)');
    });

    it('should with $nor', function() {
      query.build({ $nor: [ { a: 1 }, { b: 3 }]}).should.eql(BQ + 'NOT(r.a=1 OR r.b=3)');
      query.build({ $nor: [ { a: '1' }, { b: '3' }]}).should.eql(BQ + 'NOT(r.a="1" OR r.b="3")');
      query.build({ $nor: [ { a: '1' }]}).should.eql(BQ + 'NOT(r.a="1")');
      query.build({ $nor: [ { a: 1, b: 2 }, { c: 4 }]}).should.eql(BQ + 'NOT((r.a=1 AND r.b=2) OR r.c=4)');
    });

    it('should work with $and and $or operators together', function() {
      query.build({ $and: [{ a: 2, b: 3}, { c: 3 }] }).should.eql(BQ + '((r.a=2 AND r.b=3) AND r.c=3)');
      query.build({ $or: [{ a: 2, b: 3}, { c: 3 }] }).should.eql(BQ + '((r.a=2 AND r.b=3) OR r.c=3)');

      query.build({ $or: [{ a: 2 }, { $and: [{ a: 1 }, { b: 2 }] }] }).should.eql(BQ + '(r.a=2 OR (r.a=1 AND r.b=2))');
      query.build({ $and: [{ a: 2 }, { $or: [{ a: 1 }, { b: 2 }] }] }).should.eql(BQ + '(r.a=2 AND (r.a=1 OR r.b=2))');

      // recursive
      query.build({ $and: [
        { a: 1 },
        { $or: [ { a: 2 }, { b: 2 },
          { $and: [ { a: 1 }, { b: 1 } ] }
        ]}
      ]}).should.eql(BQ + '(r.a=1 AND (r.a=2 OR r.b=2 OR (r.a=1 AND r.b=1)))')
    });

    it('should work with symbols($gt, $gte, etc..)', function() {
      query.build({ $not: { name: { $gt: 3 }, age: 12 } }).should.eql(BQ + 'NOT(r.name > 3 AND r.age=12)');
      query.build({ $not: { name: { $ne: 'bar' } } }).should.eql(BQ + 'NOT(r.name <> "bar")');
      query.build({ $or: [
        { $not: { a: 2 } },
        { $not: { b: { $ne: 1 } } }
      ]}).should.eql(BQ + '(NOT(r.a=2) OR NOT(r.b <> 1))');

      query.build({ $or: [
        { name: { $ne: 'Ariel' } },
        { age: { $lte: 26 } },
        { $and: [
          { isAdmin: { $ne: false } },
          { isUser: { $ne: false } }
        ]}
      ]}).should.eql(BQ + '(r.name <> "Ariel" OR r.age <= 26 OR (r.isAdmin <> false AND r.isUser <> false))');

      query.build({ $or: [
        { $not: { name: { $ne: 'Ariel' } } },
        { $not: { age: { $lte: 26 } } },
        { $not:
          { $and: [
            { isAdmin: { $ne: false } },
            { isUser: { $ne: false } }
          ]}
        }
      ]}).should.eql(BQ + '(NOT(r.name <> "Ariel") OR NOT(r.age <= 26) OR NOT(r.isAdmin <> false AND r.isUser <> false))');
    });

    it('should work with symbols($in, $be) IN and BETWEEN', function() {
      query.build({ id: {$in: [1, 2, 3]}}).should.eql(BQ + 'r.id IN (\'1\',\'2\',\'3\')');
      query.build({ id: {$in: "1, 2, 3"}}).should.eql(BQ + 'r.id IN (1, 2, 3)');
      query.build({ id: {$be: "\"1\" AND \"3\""}}).should.eql(BQ + '(r.id BETWEEN "1" AND "3")');
      query.build({ id: {$be: [1, 3]}}).should.eql(BQ + '(r.id BETWEEN "1" AND "3")');
    });

    it('should allow to create objects with arrays', function() {
      query.build({ allows: [1, 2, 3]}).should.eql(BQ + 'r.allows=[1,2,3]');
    });

    it('should handle strings correctly', function() {
      query.build('r.a=1 AND r.b=2').should.eql(BQ + 'r.a=1 AND r.b=2');
    });

    it('should work with functions', function() {
      query.build({ coins: { $uin: 2 } }).should.eql({
        query: BQ + 'udf.inUDF(r.coins, 2)',
        udf: [ { id: constant.$uin.name, body: constant.$uin.func } ]
      });
      // that's how you should do the `{ coins: { $nin: 2 } }`
      query.build({ $not: { coins: { $uin: 2 } } }).should.eql({
        query: BQ + 'NOT(udf.inUDF(r.coins, 2))',
        udf: [ { id: constant.$uin.name, body: constant.$uin.func } ]
      });
      query.build({ name: { $type: 'string' } }).should.eql({
        query: BQ + 'udf.typeUDF(r.name, "string")',
        udf: [{ id: constant.$type.name, body: constant.$type.func } ]
      });

      query.build({ $not: { name: { $regex: /d+/g } } }).should.eql({
        query: BQ + 'NOT(udf.regexUDF(r.name, /d+/g))',
        udf: [ { id: constant.$regex.name, body: constant.$regex.func } ]
      });
      query.build({ $not: { age: { $type: 'number' } } }).should.eql({
        query: BQ + 'NOT(udf.typeUDF(r.age, "number"))',
        udf: [{ id: constant.$type.name, body: constant.$type.func }]
      });
    });

    it('should throw if it\'s invalid operator', function() {
      (function() {
        query.build({ name: { $foo: 'bar' } });
      }).should.throw();
    });
  });
});

describe('constants', function() {
  describe('test UDF functions', function() {
    it('.$uin()', function() {
      constant.$uin.func([1,2,3], 2).should.eql(true);
      constant.$uin.func(22, 2).should.eql(false);
      constant.$uin.func('22', 2).should.eql(false);
    });

    it('.$all()', function() {
      constant.$all.func([2,2], 2).should.eql(true);
      constant.$all.func(22, 2).should.eql(false);
      constant.$all.func('22', 2).should.eql(false);
    });

    it('.$size()', function() {
      constant.$size.func([2,2], 2).should.eql(true);
      constant.$size.func(22, 2).should.eql(false);
      constant.$size.func('22', 2).should.eql(true);
    });

    it('.$all()', function() {
      constant.$regex.func(['a',2], /^\d/).should.eql(false);
      constant.$regex.func('22', /^\d/).should.eql(true);
      constant.$regex.func(22, /^\d/).should.eql(true);
    });

    it('.$type()', function() {
      constant.$type.func(['a',2], 'object').should.eql(true);
      constant.$type.func('22', 'string').should.eql(true);
      constant.$type.func(22, 'number').should.eql(true);
    });
  });
});

describe('constants', function() {
  var filter = require('../../lib/querybuilder/filter');
  it('.format()', function() {
    filter.format('{0}{1}', 'foo').should.eql('foo{1}');
    filter.format('{0}{1}', 'foo', 'bar').should.eql('foobar');
    filter.format('{1}{0}', 'foo', 'bar').should.eql('barfoo');
  });

  it('.wrap()', function() {
    filter.wrap('a', 'b').should.eql('bab');
    filter.wrap('a', 'b', 'c').should.eql('bac');
    filter.wrap(1).should.eql(1);
  });
});