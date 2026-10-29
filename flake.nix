
{
  description = "VSCode REST Client CE - development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs_24
          git
        ];

        shellHook = ''
          echo "VSCode REST Client CE development environment"
          echo "Node.js: $(node --version)"
          echo "npm:     $(npm --version)"
        '';
      };
    };
}
