1.1
A first example would be abs(-1) the result of python program would be 1 but 
our program does not support UnaryExpression which would not be able to parse. 
However, we would be able to accomplish similar things by doing abs(0-1) in our
compiler and this would give the result of 1.
1.2
The second example would be print("abc"). The result of python program would simply
print abc to the console but our compiler does not support string data types yet
and it would simply throw an error about unexpected character.
1.3
The thrid example would be pow(2, 0-1). Since we don't have support for UnaryExpression
what on the second parameter is just -1. But we also don't have support for the 
floating point number which in python this would give us a result of 0.5, but in
our case the result if just 0.

2. I spent about 6-8 hours on this programming assignment. It took some time to 
review the lectures and the part takes the most time would be parsing. It took me
a while to read the grammar and get myself familiar with the lezer tree, what all
those nextchind() parent() is actually doing.

3. I would suggest myself to read all the readings assigned previous to doing the
PA and pay more attention to the details in lectures.

4. I would say the lecture is most useful in completing the assignment. In class,
we talked about detailed exampels about lexer trees didn't get it fully back then.
But when I went back to it, things started to make a lot more sense to me.

5. I worked with amanda tomlinson on discussing some apporach on how to determine
how many aruguments we have in CallExpression and how to determine the operation for
add, sub and mul. And also talked about some of the test cases. 