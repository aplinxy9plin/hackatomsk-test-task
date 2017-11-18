var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider(process.env.GETH_ADDRESS || "http://geth:8110"));

var clickhouse = require('@apla/clickhouse');
ch = new clickhouse(process.env.CLICKHOUSE_ADDRESS || "clickhouse");

const express = require('express')
const app = express()

const CREATE_DATABASE_STRING = "CREATE DATABASE IF NOT EXISTS cryptopoker;"
const CREATE_PLAYER_TABLES_TABLE_STRING = "CREATE TABLE IF NOT EXISTS cryptopoker.player_tables (address_player String, id_table UInt32, createdAt DateTime DEFAULT now()) Engine = Log;";
const CREATE_ACCOUNT_TABLE_STRING = "CREATE TABLE IF NOT EXISTS cryptopoker.accounts (address String, encryptedWallet String, password String, createdAt DateTime DEFAULT now()) Engine = Log;";
const CREATE_TABLES_TABLE_STRING = "CREATE TABLE IF NOT EXISTS cryptopoker.tables (id UInt32, name String, minimum_buy_in UInt32 DEFAULT 10, maximum_buy_in UInt32 DEFAULT 1000, small_blind UInt32 DEFAULT 6, big_blind UInt32 DEFAULT 3, max_players UInt32 DEFAULT 8) Engine = Log;";
const CREATE_GAME_TABLE = "CREATE TABLE IF NOT EXISTS cryptopoker.game_table (first_player String, second_player String, hash String, first_balance UInt32, second_balance UInt32) Engine = Log;";
const ADD_TEST_TABLE = "INSERT INTO cryptopoker.tables (id, name) VALUES (1, 'SuperCrypto');"

app.get('/balance', function(req, res) {
  var balance = web3.eth.getBalance(req.query.address).then(function(balance) {
    res.send({balance: balance.toString(10)});
  });
});

app.get('/register', function(req, res) {
  var account = web3.eth.accounts.create();
  var encryptedJSON = account.encrypt(account.privateKey, req.query.password);

  ch.query ("INSERT INTO cryptopoker.accounts (address, encryptedWallet, password) VALUES ('" + account.address + "', '" + JSON.stringify(encryptedJSON) + "', '" + req.query.password + "');");

  res.send({address: account.address});
});

app.get('/tables', function(req, res){
  var stream = ch.query('SELECT * FROM cryptopoker.tables');
  var tables = [];
  
  stream.on ('data', function (table) {
    tables.push (table);
  });

  stream.on ('end', function () {
    res.send({tables: tables});
  });
});

app.get('/test', function(req, res){
  var buyin = req.query.buyin;
  res.send(buyin);
});

app.get('/start', function(req, res){
  ch.query(CREATE_GAME_TABLE);
  var first_address = req.query.first_address;
  var second_address = req.query.second_address;
  var first_balance = req.query.first_balance;
  var second_balance = req.query.second_balance;
  ch.query('INSERT INTO cryptopoker.game_table (first_player,second_player,hash,first_balance,second_balance) VALUES ('+first_address+','+second_address+','+hash+','+first_balance+','+second_balance+')');
  var suits = new Array("H", "C", "S", "D");
  var cards = new Array();
  var cnt = 0;
  for(i=0; i<4; i++)
      for(j=1; j<=13; j++)
          cards[cnt++] = suits[i] + j;
  function randIntExcep(min, max, exp) {
      var n,
          exp = Array.isArray(exp) ? exp : [(isNaN(exp) ? min-1 : exp)];
      while(true){
          n = Math.floor(Math.random() * (max - min + 1)) + min;
          if(exp.indexOf(n) < 0) return n;
      }
  }
  var first_player = [];
  var second_player = [];
  var card_table = [];
  first_player[0] = cards[randIntExcep(0,51)];
  first_player[1] = cards[randIntExcep(0,51,first_player[0])];
  second_player[0] = cards[randIntExcep(0,51,[first_player[0],first_player[1]])];
  second_player[1] = cards[randIntExcep(0,51,[first_player[0],first_player[1],second_player[0]])];
  for(var i = 1; i <= 5; i++){
    card_table[i] = cards[randIntExcep(0,51,[first_player[0],first_player[1],second_player[0],second_player[1],card_table[i],card_table[i-1],card_table[i-2],card_table[i-3],card_table[i-4]])];
  }
  res.send({first1: first_player[0], first2: first_player[1], second1: second_player[0], second2: second_player[1],card_table1: card_table[0],card_table2: card_table[1],card_table3: card_table[2],card_table4: card_table[3],card_table5: card_table[4]});
});

app.get('/raise', function(req, res){
    
});

app.get('/sit', function(req, res){
  var buyin = req.query.buyin || 0;
  var tableId = req.query.table;
  var address = req.query.address;

  if (buyin > 0 && tableId && address) {
    var tablesStream = ch.query('SELECT * FROM cryptopoker.tables WHERE id = ' + tableId + ' LIMIT 1');
    var table;

    tablesStream.on ('data', function (tableRow) {
      table = tableRow;
    });

    tablesStream.on ('end', function () {
      var minBuyIn = table[2];
      var maxBuyIn = table[3];
      if (buyin >= minBuyIn && buyin <= maxBuyIn) {
        ch.query("INSERT INTO cryptopoker.player_tables (address_player, id_table) VALUES ( '" + address + "', " + tableId + " LIMIT 1", function () {
          res.send({table: table});
        });
      } else {
        res.send({error: "Buy In Too Low"})
      }
    });
  } else {
    res.send({error: "Missing a required param!"})
  }
});

app.listen(3000, function() {
  console.log('CryptoPoker Backend listening on port 3000!');

  ch.query(CREATE_DATABASE_STRING, function () {
    ch.query(CREATE_ACCOUNT_TABLE_STRING, function () {
      ch.query(CREATE_TABLES_TABLE_STRING, function () {
        ch.query(ADD_TEST_TABLE, function () {
          ch.query(CREATE_PLAYER_TABLES_TABLE_STRING);
        });
      });
    });
  });
});
