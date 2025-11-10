"use client";
export default function CadastroAlunos() {
  return (
    // Adicionamos um container principal para centralizar o formulário
    // e aplicar o fundo (que antes estava no 'body')
    <div className="page-container">
      {/* Usamos uma tag <form> e ela também servirá como 
        o container .rectangle9 
      */}
      <form className="cadastro-form">
        <h1 className="title">Cadastro Aluno</h1>

        {/* Um wrapper para as duas colunas do formulário */}
        <div className="form-columns">
          {/* Coluna da Esquerda */}
          <div className="column">
            <div className="form-group">
              <label className="label" htmlFor="nome">
                Nome do(a) Aluno(a)
              </label>
              <input type="text" id="nome" className="rect" />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="email">
                E-mail principal do Responsável
              </label>
              <input type="text" id="email" className="rect" />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="senha">
                Senha
              </label>
              <input type="password" id="senha" className="rect" />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="observacoes">
                Observações
              </label>
              {/* É melhor usar <textarea> para observações */}
              <textarea id="observacoes" className="rect rect-textarea" />
            </div>
          </div>

          {/* Coluna da Direita */}
          <div className="column">
            <div className="form-group">
              <label className="label" htmlFor="escola">
                Escola
              </label>
              <input type="text" id="escola" className="rect" />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="turma">
                Turma
              </label>
              <input type="text" id="turma" className="rect" />
            </div>

            <div className="form-group">
              <label className="label">Permissão de Fotografia</label>
              {/* É melhor usar inputs de rádio para Sim/Não */}
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="permissao" value="sim" /> Sim
                </label>
                <label className="radio-label">
                  <input type="radio" name="permissao" value="nao" /> Não
                </label>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-cadastrar">
          Cadastrar
        </button>
      </form>

      <style jsx>{`
        /* Container principal que imita o 'body' */
        .page-container {
          background: #fff8f8;
          font-family: 'Nunito', sans-serif;
          min-height: 70vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2.8rem; /* 4rem * 0.7 */
          box-sizing: border-box;
        }

        /* O formulário agora é o retângulo de fundo */
        .cadastro-form {
          width: 114.31rem; /* 163.3rem * 0.7 */
          max-width: 100%;
          background: #f2b694;
          border-radius: 3.5rem; /* 5.0rem * 0.7 */
          /* Adiciona padding interno para os elementos "respirarem" */
          padding: 3.5rem; /* 5rem * 0.7 */
          box-sizing: border-box;
        }

        .title {
          font-weight: 400;
          font-size: 4.48rem; /* 6.4rem * 0.7 */
          line-height: 6.09rem; /* 8.7rem * 0.7 */
          color: #000;
          text-align: center;
          /* Margem para separar do formulário */
          margin-bottom: 2.8rem; /* 4rem * 0.7 */
        }

        /* Container das colunas */
        .form-columns {
          display: flex;
          justify-content: space-between;
          /* Espaçamento entre as colunas */
          gap: 2.8rem; /* 4rem * 0.7 */
        }

        /* Cada coluna */
        .column {
          display: flex;
          flex-direction: column;
          flex-basis: 48%; /* Cada coluna ocupa ~metade do espaço */
          /* Espaçamento entre os grupos de formulário */
          gap: 1.75rem; /* 2.5rem * 0.7 */
        }

        /* Grupo de Label + Input */
        .form-group {
          display: flex;
          flex-direction: column;
        }

        .label {
          font-weight: 400;
          font-size: 2.52rem; /* 3.6rem * 0.7 */
          line-height: 3.43rem; /* 4.9rem * 0.7 */
          color: #000;
          /* Espaçamento entre o label e o input */
          margin-bottom: 0.7rem; /* 1rem * 0.7 */
        }

        /* Estilo unificado dos campos de entrada */
        .rect {
          box-sizing: border-box;
          background: #ffffff;
          border: 0.07rem solid #000; /* 0.1rem * 0.7 */
          box-shadow: 0rem 0.28rem 0.28rem rgba(0, 0, 0, 0.25); /* 0.4rem * 0.7 */
          border-radius: 3.5rem; /* 5.0rem * 0.7 */
          width: 100%; /* Ocupa 100% da coluna */
          height: 4.2rem; /* 6.0rem * 0.7 */
          /* Adiciona padding interno para o texto não colar nas bordas */
          padding: 0 1.4rem; /* 2rem * 0.7 */
          font-size: 1.96rem; /* 2.8rem * 0.7 (estimado) */
        }

        /* Altura específica para o textarea */
        .rect-textarea {
          height: 8.33rem; /* 11.9rem * 0.7 */
          padding: 1.05rem 1.4rem; /* 1.5rem * 0.7, 2rem * 0.7 */
          resize: vertical; /* Permite redimensionar verticalmente */
        }

        /* Estilo para o grupo de botões de rádio */
        .radio-group {
          display: flex;
          gap: 1.4rem; /* 2rem * 0.7 */
          /* Estiliza como se fosse um campo .rect */
          /* background: #ffffff;
          border: 0.07rem solid #000;
          box-shadow: 0rem 0.28rem 0.28rem rgba(0, 0, 0, 0.25); */
          border-radius: 3.5rem;
          width: 100%;
          height: 4.2rem;
          padding: 0 1.4rem;
          box-sizing: border-box;
          align-items: center;
        }

        /* Estilo para o label de cada rádio */
        .radio-label {
          font-size: 1.96rem; /* 2.8rem * 0.7 */
          display: flex;
          align-items: center;
          gap: 0.35rem; /* 0.5rem * 0.7 */
          color: #333;
        }

        .btn-cadastrar {
          width: 32.41rem; /* 46.3rem * 0.7 */
          height: 5.88rem; /* 8.4rem * 0.7 */
          background: #f8894a;
          border: none;
          border-radius: 3.5rem; /* 5.0rem * 0.7 */
          font-size: 3.36rem; /* 4.8rem * 0.7 */
          color: #000;
          cursor: pointer;
          /* Centraliza o botão */
          display: block;
          margin: 2.8rem auto 0; /* 4rem * 0.7 (margem superior), auto (laterais) */
        }
      `}</style>
    </div>
  );
}