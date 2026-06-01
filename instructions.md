# Memórias e Regras do Projeto

Este arquivo documenta as regras locais e diretrizes específicas para o desenvolvimento deste projeto. O assistente de IA deve sempre consultar estas regras antes de propor ou aplicar qualquer modificação.

## Regras de Interface e Responsividade
- **Responsividade Mobile:** Sempre ao adicionar ou alterar elementos na interface (botões, abas, opções, menus, etc.), planeje e implemente a responsividade para dispositivos móveis.
- **Acessibilidade e Usabilidade:** Não se limite a fazer o elemento caber na tela. Avalie se o elemento possui tamanho adequado para toque (mínimo de 44x44 pixels para áreas interativas), se o posicionamento é prático e confortável em telas menores, e se o fluxo de navegação se mantém intuitivo.

## Entrega e Formato de Resposta
- **Sumário de Novas Implementações:** Após concluir a implementação de qualquer novo recurso, envie ao final da resposta um sumário exatamente no seguinte formato:
  
  **Título da Implementação**
  - Item 1 resumido
  - Item 2 resumido
  - [Próximos itens...]

## Controle de Versão (Git/GitHub)
- **Não Enviar para o GitHub:** Não faça commits ou pushes para o GitHub, a menos que o usuário explicitamente solicite.

## Regras do Firestore
- **Análise de Segurança:** Sempre avalie se um novo recurso ou alteração de dados exige modificações nas regras de segurança do Firestore (`firestore.rules`). Caso seja necessário, faça as devidas liberações ou ajustes nas regras.
