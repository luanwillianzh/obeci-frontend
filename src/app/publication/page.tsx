"use client";
// Importe ícones de uma biblioteca como 'react-icons'
// Ex: import { FaUser, FaTrash, FaImage } from 'react-icons/fa';

export default function PublicacoesPage() {
  return (
    <div className="page-container">
      {/* Coluna da Esquerda (Sidebar) */}
      <aside className="sidebar">
        <h2 className="sidebar-title">Alunos</h2>
        <ul className="student-list">
          <li className="student-item active">
            <span>[i]</span> Fulano de Tal
            <button className="delete-btn">[x]</button>
          </li>
          <li className="student-item">
            <span>[i]</span> Fulano de Tal
          </li>
          <li className="student-item">
            <span>[i]</span> Fulano de Tal
          </li>
          <li className="student-item">
            <span>[i]</span> Fulano de Tal
          </li>
          <li className="student-item">
            <span>[i]</span> Fulano de Tal
            <button className="delete-btn">[x]</button>
          </li>
          <li className="student-item">
            <span>[i]</span> Fulano de Tal
          </li>
          <li className="student-item">
            <span>[i]</span> Fulano de Tal
          </li>
          <li className="student-item">
            <span>[i]</span> Fulano de Tal
          </li>
        </ul>
      </aside>

      {/* Coluna da Direita (Conteúdo Principal) */}
      <main className="main-content">
        <h1 className="main-title">Publicações</h1>

        {/* Container do Feed (o retângulo rosa claro) */}
        <div className="feed-container">
          {/* Card de Publicação */}
          <article className="post-card">
            <header className="post-header">
              <span>[i]</span> Professora Fulana de Tal
            </header>
            <div className="post-body">
              <div className="post-text">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  egestas quam quis blandit dictum. Praesent vel lacinia
                  massa. Etiam lacinia hendrerit libero vitae cursus. Etiam
                  lacinia dapibus sem, sed lobortis odio ultrices nec. Sed
                  porta fringilla pellentesque. Phasellus molestie commodo
                  libero non dictum. Vestibulum quis feugiat nulla, vel
                  pharetra sem.
                </p>
              </div>
              {/* Galeria de Imagens com CSS Grid */}
              <div className="post-gallery">
                <div className="gallery-placeholder placeholder-main">
                  [img]
                </div>
                <div className="gallery-placeholder">[img]</div>
                <div className="gallery-placeholder">[img]</div>
                <div className="gallery-placeholder">[img]</div>
                <div className="gallery-placeholder">[img]</div>
              </div>
            </div>
          </article>

          {/* Card de Publicação 2 */}
          <article className="post-card">
            <header className="post-header">
              <span>[i]</span> Professora Fulana de Tal
            </header>
            <div className="post-body">
              <div className="post-text">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  egestas quam quis blandit dictum. Praesent vel lacinia
                  massa. Etiam lacinia hendrerit libero vitae cursus.
                </p>
              </div>
              {/* Pode ter uma galeria aqui ou não */}
            </div>
          </article>
        </div>

        {/* Botão flutuante */}
        <button className="new-post-btn">Nova Publicação +</button>
      </main>

      <style jsx>{`
        .page-container {
          display: flex;
          width: 100%;
          min-height: 88vh;
          background: #fff8f8;
          font-family: 'Nunito', sans-serif; /* Assumindo a mesma fonte */
        }

        /* --- Sidebar (Alunos) --- */
        .sidebar {
          flex-basis: 300px; /* Largura da sidebar */
          flex-shrink: 0; /* Impede que a sidebar encolha */
          padding: 2.5rem;
          box-sizing: border-box;
          border-right: 1px solid rgba(0, 0, 0, 0.1);
        }

        .sidebar-title {
          font-size: 3.5rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 2rem;
        }

        .student-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .student-item {
          display: flex;
          align-items: center;
          font-size: 2.0rem;
          color: #555;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .student-item:hover {
          background: #fdeee6;
        }

        .student-item.active {
          color: #f8894a;
          font-weight: 700;
        }

        .student-item span {
          /* Placeholder para o ícone */
          margin-right: 0.75rem;
          color: #f8894a;
        }

        .delete-btn {
          margin-left: auto; /* Mágica do Flexbox para empurrar para a direita */
          background: none;
          border: none;
          color: #e53e3e;
          cursor: pointer;
          font-size: 1.1rem;
          visibility: hidden; /* Escondido por padrão */
          opacity: 0;
          transition: opacity 0.2s;
        }

        .student-item:hover .delete-btn,
        .student-item.active .delete-btn {
          visibility: visible; /* Aparece no hover ou se ativo */
          opacity: 1;
        }

        /* --- Main Content (Publicações) --- */
        .main-content {
          flex-grow: 1; /* Ocupa todo o espaço restante */
          padding: 2.5rem;
          box-sizing: border-box;
          /* Posição relativa para ancorar o botão flutuante */
          position: relative; 
        }

        .main-title {
          font-size: 5.0rem;
          font-weight: 700;
          color: #000;
          margin-bottom: 2rem;
        }

        .feed-container {
          background: #fff1eb; /* Cor rosa claro do container */
          border-radius: 25px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem; /* Espaço entre os posts */
        }

        .post-card {
          background: #ffffff;
          border-radius: 15px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .post-header {
          display: flex;
          align-items: center;
          font-size: 2.35rem;
          font-weight: 600;
          color: #f8894a;
          margin-bottom: 1rem;
        }

        .post-header span {
          margin-right: 0.75rem;
        }

        .post-body {
          display: flex;
          gap: 1.5rem;
        }

        .post-text {
          flex: 1; /* Ocupa 50% ou mais se a galeria for menor */
          line-height: 1.6;
          color: #333;
          font-size: 1.5rem;
        }

        /* --- Galeria com CSS Grid --- */
        .post-gallery {
          flex-basis: 50%; /* Define a largura base da galeria */
          display: grid;
          /* 2 colunas de texto, 1fr 1fr para as imagens pequenas */
          grid-template-columns: 2fr 1fr 1fr; 
          grid-template-rows: 1fr 1fr; /* Duas linhas de altura igual */
          gap: 0.5rem;
        }

        .gallery-placeholder {
          background: #eee;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: #aaa;
          font-size: 1.5rem;
          min-height: 100px;
        }

        .placeholder-main {
          /* A imagem principal ocupa a 1ª coluna e as 2 linhas */
          grid-column: 1 / 2;
          grid-row: 1 / 3;
          min-height: 210px; /* (100px * 2) + 0.5rem gap */
        }

        /* --- Botão Flutuante --- */
        .new-post-btn {
          position: absolute; /* Ancorado no .main-content */
          bottom: 2.5rem;
          right: 2.5rem;
          background: #f8894a;
          color: #000;
          font-weight: 600;
          border: none;
          border-radius: 50px;
          padding: 1rem 1.75rem;
          font-size: 1.7rem;
          cursor: pointer;
          box-shadow: 0 5px 15px rgba(248, 137, 74, 0.4);
          transition: all 0.2s ease-in-out;
        }

        .new-post-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(248, 137, 74, 0.5);
        }
      `}</style>
    </div>
  );
}