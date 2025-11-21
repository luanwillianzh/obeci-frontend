"use client";
import "./publication.css";

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
                  egestas quam quis blandit dictum. Praesent vel lacinia massa.
                  Etiam lacinia hendrerit libero vitae cursus. Etiam lacinia
                  dapibus sem, sed lobortis odio ultrices nec. Sed porta
                  fringilla pellentesque. Phasellus molestie commodo libero non
                  dictum. Vestibulum quis feugiat nulla, vel pharetra sem.
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
                  egestas quam quis blandit dictum. Praesent vel lacinia massa.
                  Etiam lacinia hendrerit libero vitae cursus.
                </p>
              </div>
              {/* Pode ter uma galeria aqui ou não */}
            </div>
          </article>
        </div>

        {/* Botão flutuante */}
        <button className="new-post-btn">Nova Publicação +</button>
      </main>
    </div>
  );
}
