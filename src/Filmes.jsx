import { useAuth0 } from "@auth0/auth0-react";
import React, { useEffect, useState } from "react";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";

const BASE_URL = "/api"; 

function getRolesFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (
      payload["https://example.com/roles"] ||
      payload.roles ||
      (payload.realm_access && payload.realm_access.roles) ||
      []
    );
  } catch (e) {
    return [];
  }
}

export default function PessoasApp() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nota, setNota] = useState("");

  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAndSetRoles(); 
    }
  }, [isAuthenticated]);

  async function loadAndSetRoles() {
    try {
      const token = await getAccessTokenSilently();
      const roles = getRolesFromToken(token);
      setIsAdmin(Array.isArray(roles) && roles.includes("admin"));
      await fetchItemsWithToken(token);
    } catch (e) {
      console.error("Erro ao obter token/roles:", e);
    }
  }

  async function fetchItemsWithToken(optionalToken) {
    setLoading(true);
    setError(null);
    try {
      const token = optionalToken || await getAccessTokenSilently();
      const res = await fetch(`${BASE_URL}/films`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Erro ao carregar: ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    const dto = {
      nome: nome || null,
      descricao: descricao || null,
      nota: nota ? parseInt(nota, 10) : null,
      diretor: user.name || "desconhecido"
    };

    if (!dto.nome) return setError("Nome é obrigatório");
    if (dto.nota == null || Number.isNaN(dto.nota) || dto.nota < 0 || dto.nota > 5) {
      return setError("Nota deve ser número entre 0 e 5");
    }

    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BASE_URL}/films`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro ao criar: ${res.status} ${text}`);
      }

      const created = await res.json();
      setItems(prev => [created, ...prev]);
      setNome("");
      setDescricao("");
      setNota("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Confirma exclusão?")) return;
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BASE_URL}/films/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 204) {
        setItems(prev => prev.filter(i => i.id !== id));
        return;
      }
      if (res.status === 403) throw new Error("Apenas administradores podem excluir.");
      const text = await res.text();
      throw new Error(`Erro ao excluir: ${res.status} ${text}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!isAuthenticated) {
    return <LoginButton />;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 font-sans">
      <div>
        <img src={user.picture} alt={user.name} style={{width:80,borderRadius:8}} />
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <LogoutButton />
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Filmes — criação e listagem</h1>

        <form onSubmit={handleCreate} className="space-y-3 mb-6">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className="p-2 border rounded w-full" />
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" className="p-2 border rounded w-full" />
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (0-5)" className="p-2 border rounded w-1/6" />

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Criar</button>
            <button type="button" onClick={() => loadAndSetRoles()} className="px-4 py-2 bg-gray-200 rounded">Recarregar</button>
          </div>
        </form>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        <div>
          <h2 className="text-xl font-semibold mb-2">Lista de Filmes</h2>

          {loading ? <div>Carregando...</div> : items.length === 0 ? <div>Nenhum filme encontrado.</div> : (
            <ul className="space-y-3">
              {items.map((f) => (
                <li key={f.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{f.nome} — <span className="text-sm">({f.diretor})</span></div>
                    <div className="text-sm text-gray-600">{f.descricao}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium mr-4">Nota: {f.nota}</div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(f.id)} className="px-3 py-1 bg-red-600 text-white rounded">Excluir</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
