var results = [];
function calc(x, resolve, reject) {
    setTimeout(() => {
        resolve(2 * x);
    }, Math.floor(Math.random() * (1000 - 0)) + 0);
}
for (var x = 0; x < 10; x++) {
    var prom = new Promise((resolve, reject) => {
        calc(x, resolve, reject);
    });
    results.push(prom);
}
Promise.all(results).then(out => {
    for (var i = 0; i <= out.length - 1; i++) {
    	console.log(out[i]);
    }
});
