from .UrnGame import *

class CESM():

    def __init__(self,urnGame=None,s=0.7,gamma=1,w=0):        
        if not urnGame:
            self.urns = UrnGame()
        else:
            self.urns = urnGame
        self.priors = self.urns.get_urn_probs()
        self.s = s
        self.gamma=gamma
        self.w = w

    def get_causal_judgement(self,obs,proposition,norm=False):

        if (type(obs[0]) != list) or   (type(obs[0]) != np.array ):
            actual_world = self.urns.get_world(int(obs[0]))
        else:
            actual_world = obs[0]
        # New loss rule using negation of events that do not happen
        loss_proposition = proposition
        if not obs[1]:
            vars_absent = [i for i,v in enumerate(actual_world)  if not v]
            loss_rule = (lambda x: int(not any([x[i] for i in vars_absent])))
            loss_proposition = [int(loss_rule(world)) for world in self.urns.get_all_worlds()]
        
        return (1-self.w)*self._compute_judgements((actual_world,obs[1]),proposition,norm=norm) + self.w * self._compute_judgements((actual_world,obs[1]),loss_proposition,norm=norm)
    
    def _compute_judgements(self,obs,proposition,norm=False):    
    
        actual_world = np.array(obs[0])
        n_vars = len(actual_world)
        # world number to get world specific data
        world_num = self.urns.get_world_number(actual_world)
        
        # Get the output string
        out_val = proposition[world_num]
        out = 1*(np.array(proposition) == out_val)
        
        # get possible worlds 
        possible_worlds = np.array(self.urns.get_all_worlds())
        
        # Get the cf world probs
        sp_priors = [self.s+((1-self.s)*self.priors[i]) if actual_world[i] else (1-self.s)*self.priors[i] for i in range(n_vars)] #sampling propensity
        cf_priors = self.urns.get_world_priors(sp_priors) #new world priors using the sampling propensities
    
    
        # Outcome stats
        out_mean = np.dot(out,cf_priors)
        out_diff = out-out_mean
        out_var = np.dot(cf_priors,out_diff**2)
    
        
        explanation_strength = np.zeros(2**n_vars-1) 
    
        explanations = powerset(range(n_vars))[1:]
        
        for idx, explanation in enumerate(explanations):
            
            # Worlds in which the explanation is present
            explanation_present = np.array([int(all(world[explanation]==actual_world[explanation])) for world in possible_worlds])
            
            # Explanation stats
            exp_mean = np.dot(explanation_present,cf_priors)
            exp_diff = explanation_present-exp_mean
            exp_var = np.dot(cf_priors,exp_diff**2)
            
            covariance = np.sum([prior*exp_diff[i]*out_diff[i] for i,prior in enumerate(cf_priors)])
    
            
            
            if exp_var == 0 or out_var == 0:
                explanation_strength[idx] = 0
            else:
                explanation_strength[idx] = covariance/(np.sqrt(out_var*exp_var))
    
        explanation_strength = explanation_strength**self.gamma 
        return np.exp(explanation_strength)/np.exp(explanation_strength).sum() if norm else explanation_strength
 