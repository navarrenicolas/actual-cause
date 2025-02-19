# import numpy as np 
from .UrnGame import *

class NSM():

    def __init__(self, urnGame = None,s=0.12,gamma=1,w=0):
        if not urnGame:
            self.urns = UrnGame()
        else:
            self.urns = urnGame
        self.priors = self.urns.get_urn_probs()
        self.s = s
        self.gamma=gamma
        self.w = w

        
    def get_causal_judgement(self,obs,proposition,model='hard',norm=False):

        if (type(obs[0]) != list) or   (type(obs[0]) != np.array ):
            actual_world = self.urns.get_world(int(obs[0]))
        # New loss rule using negation of events that do not happen
        loss_proposition = proposition
        if not obs[1]:
            vars_absent = [i for i,v in enumerate(actual_world)  if not v]
            loss_rule = (lambda x: int(not any([x[i] for i in vars_absent])))
            loss_proposition = [int(loss_rule(world)) for world in self.urns.get_all_worlds()]
        
        if model == 'hard':
            return (1-self.w)*self._hard_necessity_judgements((actual_world,obs[1]),proposition,norm=norm) + self.w * self._hard_necessity_judgements((actual_world,obs[1]),loss_proposition,norm=norm)
        elif model =='marginal':
            return (1-self.w)*self._marginal_necessity_judgements((actual_world,obs[1]),proposition,norm=norm) + self.w * self._marginal_necessity_judgements((actual_world,obs[1]),loss_proposition,norm=norm)
        return None

    def _hard_necessity_judgements(self,obs,proposition,norm=False):
        '''
        obs: tuple (list,int) 
        '''

        actual_world = obs[0]
        n_vars = len(actual_world)
        explanation_strength = np.zeros(2**n_vars-1) 
        win_lose = obs[1] # Get current observed outcome

        possible_worlds = self.urns.get_all_worlds() #generate the set of all possible worlds
        sp_priors = [self.s+((1-self.s)*self.priors[i]) if actual_world[i] else (1-self.s)*self.priors[i] for i in range(n_vars)] #sampling propensity
        world_priors = self.urns.get_world_priors(sp_priors) #new world priors using the sampling propensities
    
        
        explanations = powerset(range(n_vars))[1:]
        
        for idx, explanation in enumerate(explanations):
    
            # Necessity interventions 
            necessity_interventions = self.urns.all_interventions(actual_world,explanation) # Set of all intervened worlds
            intervention_probs = [self.urns.get_marginal_prob(possible_worlds[w],explanation,world_priors) for w in necessity_interventions] # Probability of interventions
    
            # Hard interventions only
            P_nu = [int(proposition[intervention_world] != win_lose) for intervention_world in necessity_interventions]
            
            # Marginalization process for sufficiency
            sufficiency_worlds = np.zeros(2**n_vars)
            sufficiency_success = np.zeros(2**n_vars)
            for wi, world in enumerate(possible_worlds):     
                # Check that the world matches the real world value
                sufficiency_intervention = np.array(world)
                sufficiency_intervention[explanation] = actual_world[explanation]
                
                if (proposition[wi] != win_lose):
                    sufficiency_worlds[wi] = 1
                    # Given that it is a necessity world, check if the intervention was effective
                    if proposition[self.urns.get_world_number(sufficiency_intervention)] == win_lose :
                        sufficiency_success[wi] = 1
            
            if np.dot(world_priors,sufficiency_worlds) == 0:
                # print('No sufficiency: ',priors)
                P_sigma = 0
            else:
                P_sigma = np.dot(world_priors,sufficiency_success)/np.dot(world_priors,sufficiency_worlds)
    
            sigma_strength = self.urns.get_marginal_prob(actual_world,explanation,world_priors)
            
            # Sum the necessity and sufficiency measure
            explanation_strength[idx] = np.dot(intervention_probs,P_nu) + sigma_strength*P_sigma
    
        explanation_strength = explanation_strength**self.gamma
        return np.exp(explanation_strength)/np.exp(explanation_strength).sum() if norm else explanation_strength            
    
    def _marginal_necessity_judgements(self, obs,proposition,norm=False):
        '''
        obs: tuple (list,int)
        
        '''
        
        if len(obs[0]) <= 1:
            actual_world = self.urns.get_world(obs[0])
        else:
            actual_world = np.array(obs[0])
        n_vars = len(obs[0])
        explanation_strength = np.zeros(2**n_vars-1) 
        win_lose = obs[1] # Get current observed outcome
        
        possible_worlds = self.urns.get_all_worlds() #generate the set of all possible worlds
        sp_priors = [self.s+((1-self.s)*self.priors[i]) if actual_world[i] else (1-self.s)*self.priors[i] for i in range(n_vars)] #sampling propensity
        world_priors = self.urns.get_world_priors(sp_priors) #new world priors using the sampling propensities
    
        explanations = powerset(range(n_vars))[1:]
        
        for idx, explanation in enumerate(explanations):
    
            # Necessity interventions 
            necessity_interventions = self.urns.all_interventions(actual_world,explanation) # Set of all intervened worlds
            intervention_probs = [self.urns.get_marginal_prob(possible_worlds[w],explanation,world_priors) for w in necessity_interventions] # Probability of interventions
    
            P_nu = np.zeros(len(necessity_interventions))
            for idx,intervention_world in enumerate(necessity_interventions):
    
                # Variables we are intervening onto
                intervention_vars = np.array(possible_worlds[intervention_world])[explanation] 
    
                # Marginalization process for necessity
                necessity_worlds = np.zeros(2**n_vars)
                necessity_success = np.zeros(2**n_vars)
                for wi,world in enumerate(possible_worlds):    
                    
                    necessity_intervention = np.array(world)
                    necessity_intervention[explanation] = intervention_vars
                    
                    # Check that the world matches the new intervened variable
                    if (proposition[wi] == win_lose):
                        necessity_worlds[wi] = 1
                        # Given that it is a necessity world, check if the intervention was effective
                        if proposition[self.urns.get_world_number(necessity_intervention)] != win_lose :
                            necessity_success[wi] = 1
    
                
                
                if np.dot(world_priors,necessity_worlds) == 0:
                    P_nu[idx] = 0
                else:
                    P_nu[idx] = np.dot(world_priors,necessity_success)/np.dot(world_priors,necessity_worlds)
    
            # Marginalization process for sufficiency
            sufficiency_worlds = np.zeros(2**n_vars)
            sufficiency_success = np.zeros(2**n_vars)
            for wi, world in enumerate(possible_worlds):     
                # Check that the world matches the real world value
                sufficiency_intervention = np.array(world)
                sufficiency_intervention[explanation] = actual_world[explanation]
                
                if (proposition[wi] != win_lose):
                    sufficiency_worlds[wi] = 1
                    # Given that it is a necessity world, check if the intervention was effective
                    if proposition[self.urns.get_world_number(sufficiency_intervention)] == win_lose :
                        sufficiency_success[wi] = 1
            
            if np.dot(world_priors,sufficiency_worlds) == 0:
                # print('No sufficiency: ',priors)
                P_sigma = 0
            else:
                P_sigma = np.dot(world_priors,sufficiency_success)/np.dot(world_priors,sufficiency_worlds)
    
            sigma_strength = self.urns.get_marginal_prob(actual_world,explanation,world_priors)
    
            # Sum the necessity and sufficiency measure
            explanation_strength[idx] = np.dot(intervention_probs,P_nu) + sigma_strength*P_sigma
    
        explanation_strength=explanation_strength**self.gamma
        norm_scores = np.exp(explanation_strength)/np.exp(explanation_strength).sum()
        return norm_scores if norm else explanation_strength
