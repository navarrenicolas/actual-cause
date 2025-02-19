from .urnUtils import *

class UrnGame():
    '''
    This class simulates the urn sampling game.
    It can compute causal selection judgements for any sample.
    '''

    def __init__(self,n_urns = 2,urn_probs=[0.1,0.9]):

        self._n_urns = n_urns
        
        # Check that the number of urns and given probabilities match
        if sum(urn_probs) != 1 or len(urn_probs) != n_urns:
            self._urn_probs = (lambda x: x/sum(x))(np.random.rand(self._n_urns))
        else:
            self._urn_probs = urn_probs

        # Define the set of possible worlds
        self._possible_worlds = np.zeros((2**(self._n_urns),self._n_urns))
        for world in range(self._possible_worlds.shape[0]):
            for urn in range(self._possible_worlds.shape[1]):
                self._possible_worlds[world, urn] = (world >> urn) & 1
        # To get the conventional ordering for the truth table
        self._possible_worlds = np.flip(self._possible_worlds,axis=1)

        # Define the set of propositions
        self._propositions = np.zeros(
                (2**self._possible_worlds.shape[0],
                 self._possible_worlds.shape[0]))
        for proposition in range(self._propositions.shape[0]):
            for world in range(self._propositions.shape[1]):
                self._propositions[proposition, world] = (proposition >> world) & 1
        
        self._propositions_map = { tuple(self._propositions[i]):i  for i in range(self._propositions.shape[0])}

        world_priors = np.zeros(16)
        for idx,world in enumerate(self._possible_worlds):
            sample_probabilities = [self._urn_probs[idx] if urn else (1-self._urn_probs[idx]) for idx,urn in enumerate(world)]
            world_priors[idx] = np.prod(sample_probabilities)

        self._world_probs = world_priors

        return

    # Get the number of urns in the game
    def get_urn_probs(self):
        return self._urn_probs

    # Get the number of urns in the game
    def num_urns(self):
        return self._n_urns

    # Get the number of possible worlds in the game
    def num_worlds(self):
        return self._possible_worlds.shape[0]

    # Get the number of propositions in the game
    def num_propositions(self):
        return self._propositions.shape[0]

    def get_world(self,world_num):
        if world_num not in range(self._possible_worlds.shape[0]):
            # World index out of range
            return
        return self._possible_worlds[world_num]

    def get_all_worlds(self):
        return self._possible_worlds

    def get_all_propositions(self):
        return self._propositions

    def get_proposition(self,prop_num):
        if prop_num not in range(self._propositions.shape[0]):
            # World index out of range
            return
        return self._propositions[prop_num]

    def get_world_number(self,world):
        if len(world) != self._n_urns:
            return 
        return np.where((self._possible_worlds == world).all(axis=1))[0][0]

    def get_proposition_number(self,proposition):
            return self._propositions_map[tuple(proposition)]

    def get_world_prob(self,world):
        if type(world)==int:
            if world in range(self._possible_worlds.shape[0]):
                return self._world_probs[world]
        if len(world) == 4:
            return self._world_probs[self.get_world_number(world)]
        return

    def get_world_priors(self,priors):
        world_priors = np.zeros(16)
        for idx,world in enumerate(self._possible_worlds):
            sample_probabilities = [priors[idx] if urn else (1-priors[idx]) for idx,urn in enumerate(world)]
            world_priors[idx] = np.prod(sample_probabilities)
        return world_priors

    def get_marginal_prob(self,world,variables,priors):
        w_priors = self.get_world_priors(priors)
        world_probs = []
        for wi,pw in enumerate(self._possible_worlds):
            if all(world[variables] == pw[variables]):
                world_probs.append(w_priors[wi])
        return np.sum(world_probs)

    def world_intervene(self,world,variables):
        # Check that the world is an array
        if len(world) != self._n_urns:
            return

        # Check that the variables are within the number of urns
        if any([var not in range(self._n_urns) for var in variables]):
            return 

        new_world = np.zeros(self._n_urns)
        for idx,var in enumerate(world):
            if idx in variables:
                new_world[idx] = 1 - var
            else:
                new_world[idx] = var
        return (new_world,self.get_world_number(new_world))

    def all_interventions(self,world,variables):
        interventions = powerset(variables)
        interventions.remove([])
        return [self.world_intervene(world,intervention)[1] for intervention in interventions]

    def get_rule(self,func):
        return [func(w) for w in self._possible_worlds]


    def var_worlds(slef,var):
        world_nums = []
        for i,w in enumerate(self._possible_worlds):
            if w[var]:
                world_nums.append(i)
        return world_nums

    def count_dependence(self,prop):
        dependent_vars = 0
        var_worlds = []
        for var in range(self._n_urns):
            var_worlds.append(self.var_worlds(var))
            for w in var_worlds[var]:
                if prop[w] != prop[self.world_intervene(self._possible_worlds[w],[var])[1]]:
                    dependent_vars += 1
                    break
        return 1+self._n_urns-dependent_vars 

