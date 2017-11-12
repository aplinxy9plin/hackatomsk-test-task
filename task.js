function calc(x, resolve, reject){
	var wait = Math.floor(Math.random() * (1000 - 0 + 1)) + 0;
	sleep(wait);
	return(2*x);
}
for (var x = 0; x < 10; x++) {
	console.log(calc(x));
}
function sleep(ms) {
	ms += new Date().getTime();
	while (new Date() < ms){}
} 