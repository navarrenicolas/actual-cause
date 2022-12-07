
#Computing Quilien values for 'Study 2a'

#Number of samples we want to simulate

n <- 10^4


# the stability parameter
s <- 0.73

# probabilities of causes
#here I am giving the probabilities used in Study 2a
pa <- 0.05
pb <- 0.5
pc <- 0.95
#pd <- 0. #add as many other variables as you like



# define an array with the actual-world values:
aw <- c(1,1, 1) # here also, you can add as many as you please if you want more variables

# derive the sampling probabilities by incorporating actual-world information:
pa <- s*aw[1]+(1-s)*pa
pb <- s*aw[2]+(1-s)*pb
pc <- s*aw[3]+(1-s)*pc
# pd <- s*aw[4]+(1-s)*pd

# sample exogenous variables
#this will generate 10^4 worlds where each value is sampled with the relevant propensity
a <- rbinom(n,1,pa)
b <- rbinom(n,1,pb)
c <- rbinom(n,1,pc)
# d <- rbinom(n,1,pd)


#here we define the rule that links observations and outcomes.
#The rule has to be written as a boolean, which translates the fact that one needs 'at least 2'
#colored balls to win the game
e <- (a & b) | (c&b) | (a&c) | (a&b&c)

#Then one just has to take the Pearson correlation coefficient between one variable or plural
#and the outcome


cor(a, e)
cor(b, e)
cor(c, e)

cor(a&b, e)
cor(a&c, e)
cor(b&c, e)

cor(a&b&c, e)
