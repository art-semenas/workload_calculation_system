import socket
import threading

def handle(client):
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.connect('/var/run/docker.sock')
    def fwd(src, dst):
        try:
            while True:
                data = src.recv(65536)
                if not data:
                    break
                dst.sendall(data)
        except Exception:
            pass
        finally:
            try: src.close()
            except: pass
            try: dst.close()
            except: pass
    threading.Thread(target=fwd, args=(client, server), daemon=True).start()
    threading.Thread(target=fwd, args=(server, client), daemon=True).start()

tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
tcp.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
tcp.bind(('0.0.0.0', 2375))
tcp.listen(10)
print('Docker proxy listening on :2375', flush=True)
while True:
    client, _ = tcp.accept()
    threading.Thread(target=handle, args=(client,), daemon=True).start()
