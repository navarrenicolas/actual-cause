import numpy  as np

# Function to get the top N elements of a list
def top_n(a,n):
        return np.flip(np.argsort(a)[-n:])

def powerset(s):
    x = len(s)
    sets = []
    for i in range(1 << x):
        sets.append([s[j] for j in range(x) if (i & (1 << j))])
    return sets